import { useEffect, useRef, useState } from 'react'

const HEX_SIZE = 40
const PALETTE_HEX_SIZE = 22
const SIDE = 5 // hexagons per side of the overall hexagon
const RADIUS = SIDE - 1 // axial radius

const SQRT3 = Math.sqrt(3)

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c']

type Axial = { q: number; r: number }

// Tetrahex shapes, each defined as 4 axial offsets from (0,0)
const TETRAHEX_SHAPES: Axial[][] = [
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }], // I
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 2, r: -1 }], // C
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: -1 }], // Y / tripod
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 2, r: -1 }], // S / zigzag
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: 1 }], // rhombus
	[{ q: 0, r: 0 }, { q: 0, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }], // L
]

function rotate(cell: Axial): Axial {
	return { q: -cell.r, r: cell.q + cell.r }
}

function randomPiece(): { cells: Axial[]; color: string } {
	const shape = TETRAHEX_SHAPES[Math.floor(Math.random() * TETRAHEX_SHAPES.length)]
	const rotations = Math.floor(Math.random() * 6)
	let cells = shape
	for (let i = 0; i < rotations; i++) {
		cells = cells.map(rotate)
	}
	const color = COLORS[Math.floor(Math.random() * COLORS.length)]
	return { cells, color }
}

function hexCorner(cx: number, cy: number, size: number, i: number) {
	const angleDeg = 60 * i - 30
	const angleRad = (Math.PI / 180) * angleDeg
	return [cx + size * Math.cos(angleRad), cy + size * Math.sin(angleRad)]
}

function hexPoints(cx: number, cy: number, size: number) {
	return Array.from({ length: 6 }, (_, i) => hexCorner(cx, cy, size, i))
		.map(([x, y]) => `${x},${y}`)
		.join(' ')
}

function axialToPixel(q: number, r: number, size: number) {
	return { x: SQRT3 * size * (q + r / 2), y: 1.5 * size * r }
}

function inGrid(q: number, r: number) {
	return Math.abs(q) <= RADIUS && Math.abs(r) <= RADIUS && Math.abs(q + r) <= RADIUS
}

function generateCells(): Axial[] {
	const result: Axial[] = []
	for (let q = -RADIUS; q <= RADIUS; q++) {
		const rMin = Math.max(-RADIUS, -q - RADIUS)
		const rMax = Math.min(RADIUS, -q + RADIUS)
		for (let r = rMin; r <= rMax; r++) {
			result.push({ q, r })
		}
	}
	return result
}

// All straight lines through the grid, one set per axial direction (q, r, s)
function generateLines(allCells: Axial[]): Axial[][] {
	const byQ = new Map<number, Axial[]>()
	const byR = new Map<number, Axial[]>()
	const byS = new Map<number, Axial[]>()
	for (const c of allCells) {
		const s = -c.q - c.r
		for (const [map, key] of [
			[byQ, c.q],
			[byR, c.r],
			[byS, s],
		] as const) {
			if (!map.has(key)) map.set(key, [])
			map.get(key)!.push(c)
		}
	}
	return [...byQ.values(), ...byR.values(), ...byS.values()]
}

const ALL_CELLS = generateCells()
const LINES = generateLines(ALL_CELLS)

interface Dragging {
	pieceIndex: number
	color: string
	cells: Axial[]
	pointer: { x: number; y: number }
	targetCells: Axial[]
	valid: boolean
}

function HexGrid() {
	const svgRef = useRef<SVGSVGElement>(null)
	const [filled, setFilled] = useState<Record<string, string>>({})
	const filledRef = useRef(filled)
	filledRef.current = filled
	const [pieces, setPieces] = useState(() => [randomPiece(), randomPiece(), randomPiece()])
	const [dragging, setDragging] = useState<Dragging | null>(null)
	const [score, setScore] = useState(0)

	useEffect(() => {
		const clearedLines = LINES.filter((line) => line.every((c) => filled[`${c.q},${c.r}`]))
		if (clearedLines.length === 0) return

		const sortedLines = [...clearedLines].sort((a, b) => a.length - b.length)
		let gained = 0
		sortedLines.forEach((line, index) => {
			gained += 100 * line.length * (index + 1)
		})
		setScore((s) => s + gained)

		setFilled((f) => {
			const next = { ...f }
			for (const line of clearedLines) {
				for (const c of line) {
					delete next[`${c.q},${c.r}`]
				}
			}
			return next
		})
	}, [filled])

	const cells = ALL_CELLS

	const gridWidth = SQRT3 * HEX_SIZE * (2 * RADIUS + 2)
	const gridHeight = HEX_SIZE * 1.5 * (2 * RADIUS + 1) + HEX_SIZE
	const paletteHeight = PALETTE_HEX_SIZE * 1.5 * 3 + PALETTE_HEX_SIZE * 2

	const width = gridWidth
	const height = gridHeight + paletteHeight

	const centerX = width / 2
	const centerY = gridHeight / 2

	const cellPixels = cells.map((c) => {
		const { x, y } = axialToPixel(c.q, c.r, HEX_SIZE)
		return { ...c, x: centerX + x, y: centerY + y }
	})

	const toSvgPoint = (e: PointerEvent | React.PointerEvent) => {
		const svg = svgRef.current
		if (!svg) return { x: 0, y: 0 }
		const ctm = svg.getScreenCTM()
		if (!ctm) return { x: 0, y: 0 }
		const point = svg.createSVGPoint()
		point.x = e.clientX
		point.y = e.clientY
		const transformed = point.matrixTransform(ctm.inverse())
		return { x: transformed.x, y: transformed.y }
	}

	const pixelToAxial = (x: number, y: number): Axial => {
		const relX = x - centerX
		const relY = y - centerY
		const qf = ((SQRT3 / 3) * relX - relY / 3) / HEX_SIZE
		const rf = ((2 / 3) * relY) / HEX_SIZE
		const sf = -qf - rf
		let q = Math.round(qf)
		let r = Math.round(rf)
		const s = Math.round(sf)
		const qDiff = Math.abs(q - qf)
		const rDiff = Math.abs(r - rf)
		const sDiff = Math.abs(s - sf)
		if (qDiff > rDiff && qDiff > sDiff) {
			q = -r - s
		} else if (rDiff > sDiff) {
			r = -q - s
		}
		return { q, r }
	}

	const computeDrag = (
		pieceIndex: number,
		color: string,
		pieceCells: Axial[],
		point: { x: number; y: number },
	): Dragging => {
		const pixels = pieceCells.map((c) => axialToPixel(c.q, c.r, HEX_SIZE))
		const centroidX = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length
		const centroidY = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length
		const anchor = pixelToAxial(point.x - centroidX, point.y - centroidY)
		const targetCells = pieceCells.map((c) => ({ q: anchor.q + c.q, r: anchor.r + c.r }))
		const valid = targetCells.every(
			(c) => inGrid(c.q, c.r) && !filledRef.current[`${c.q},${c.r}`],
		)
		return { pieceIndex, color, cells: pieceCells, pointer: point, targetCells, valid }
	}

	const handlePieceDown = (
		pieceIndex: number,
		color: string,
		pieceCells: Axial[],
		e: React.PointerEvent,
	) => {
		const p = toSvgPoint(e)
		setDragging(computeDrag(pieceIndex, color, pieceCells, p))
	}

	useEffect(() => {
		if (!dragging) return

		const handleMove = (e: PointerEvent) => {
			const p = toSvgPoint(e)
			setDragging((current) => {
				if (!current) return current
				return computeDrag(current.pieceIndex, current.color, current.cells, p)
			})
		}

		const handleUp = () => {
			setDragging((current) => {
				if (!current) return null
				if (current.valid) {
					setFilled((f) => {
						const next = { ...f }
						for (const c of current.targetCells) {
							next[`${c.q},${c.r}`] = current.color
						}
						return next
					})
					setPieces((ps) =>
						ps.map((piece, i) => (i === current.pieceIndex ? randomPiece() : piece)),
					)
				}
				return null
			})
		}

		window.addEventListener('pointermove', handleMove)
		window.addEventListener('pointerup', handleUp)
		return () => {
			window.removeEventListener('pointermove', handleMove)
			window.removeEventListener('pointerup', handleUp)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dragging !== null])

	const slotCenters = [centerX - gridWidth / 3, centerX, centerX + gridWidth / 3].map((x) => ({
		x,
		y: gridHeight + paletteHeight / 2,
	}))

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
			<div style={{ fontSize: 24, fontWeight: 'bold' }}>Score: {score}</div>
			<svg
			ref={svgRef}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			style={{ touchAction: 'none' }}
		>
			{cellPixels.map((c) => (
				<polygon
					key={`${c.q},${c.r}`}
					points={hexPoints(c.x, c.y, HEX_SIZE)}
					fill={filled[`${c.q},${c.r}`] ?? '#f5d76e'}
					stroke="#333"
					strokeWidth={1}
				/>
			))}

			{dragging &&
				dragging.targetCells
					.filter((c) => inGrid(c.q, c.r))
					.map((c, i) => {
					const { x, y } = axialToPixel(c.q, c.r, HEX_SIZE)
					return (
						<polygon
							key={i}
							points={hexPoints(centerX + x, centerY + y, HEX_SIZE)}
							fill={dragging.valid ? dragging.color : '#ff0000'}
							stroke="none"
							opacity={dragging.valid ? 0.35 : 0.25}
							pointerEvents="none"
							style={{ transition: 'fill 0.1s ease, opacity 0.1s ease' }}
						/>
					)
				})}

			{pieces.map((piece, i) => {
				if (dragging && dragging.pieceIndex === i) return null
				const slot = slotCenters[i]
				const pixels = piece.cells.map((c) => axialToPixel(c.q, c.r, PALETTE_HEX_SIZE))
				const minX = Math.min(...pixels.map((p) => p.x))
				const maxX = Math.max(...pixels.map((p) => p.x))
				const minY = Math.min(...pixels.map((p) => p.y))
				const maxY = Math.max(...pixels.map((p) => p.y))
				const offsetX = slot.x - (minX + maxX) / 2
				const offsetY = slot.y - (minY + maxY) / 2
				return (
					<g
						key={i}
						style={{ cursor: 'grab' }}
						onPointerDown={(e) => handlePieceDown(i, piece.color, piece.cells, e)}
					>
						{pixels.map((p, j) => (
							<polygon
								key={j}
								points={hexPoints(p.x + offsetX, p.y + offsetY, PALETTE_HEX_SIZE)}
								fill={piece.color}
								stroke="#333"
								strokeWidth={1}
							/>
						))}
					</g>
				)
			})}

			{dragging &&
				(() => {
					const pixels = dragging.cells.map((c) => axialToPixel(c.q, c.r, HEX_SIZE))
					const centroidX = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length
					const centroidY = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length
					return (
						<g style={{ cursor: 'grabbing' }} pointerEvents="none">
							{pixels.map((p, i) => (
								<polygon
									key={i}
									points={hexPoints(
										dragging.pointer.x + (p.x - centroidX),
										dragging.pointer.y + (p.y - centroidY),
										HEX_SIZE,
									)}
									fill={dragging.color}
									stroke="#333"
									strokeWidth={1}
									opacity={0.85}
								/>
							))}
						</g>
					)
				})()}
			</svg>
			<button type="button" onClick={() => setFilled({})}>
				Clear grid
			</button>
		</div>
	)
}

export default HexGrid
