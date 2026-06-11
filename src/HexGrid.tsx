import { useEffect, useRef, useState } from 'react'
import gearIcon from './assets/gear.png'
import { fetchLeaderboard, isLeaderboardConfigured, submitScore, type LeaderboardEntry } from './leaderboard'
import './HexGrid.css'

const HEX_SIZE = 40
const PALETTE_HEX_SIZE = 22
const SIDE = 5 // hexagons per side of the overall hexagon
const RADIUS = SIDE - 1 // axial radius

const SQRT3 = Math.sqrt(3)

interface Theme {
	id: string
	name: string
	pieceColors: string[]
	emptyCell: string
	background: string
	surface: string
	text: string
	textSecondary: string
	mode: 'light' | 'dark'
}

const THEMES: Theme[] = [
	{
		id: 'classic',
		name: 'Classic',
		pieceColors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#34495e', '#f1c40f'],
		emptyCell: '#f5d76e',
		background: '#f4f6f7',
		surface: '#ffffff',
		text: '#5d6d7e',
		textSecondary: '#95a5a6',
		mode: 'light',
	},
	{
		id: 'pastel',
		name: 'Pastel',
		pieceColors: ['#ffadad', '#a0c4ff', '#caffbf', '#cdb4db', '#ffd6a5', '#9bf6ff', '#fdffb6', '#bdb2ff'],
		emptyCell: '#fff1d6',
		background: '#fef9f5',
		surface: '#ffffff',
		text: '#9a8c98',
		textSecondary: '#cdb4db',
		mode: 'light',
	},
	{
		id: 'neon',
		name: 'Neon',
		pieceColors: ['#ff6b6b', '#4cc9f0', '#7bf1a8', '#b388ff', '#ffd166', '#f15bb5', '#ffffff', '#fee440'],
		emptyCell: '#1b1f3b',
		background: '#0d1117',
		surface: '#161b2e',
		text: '#f1f1f1',
		textSecondary: '#8892b0',
		mode: 'dark',
	},
	{
		id: 'space',
		name: 'Space',
		pieceColors: ['#8d99ae', '#5e6a8c', '#9a8c98', '#6f8a93', '#7d6e83', '#576f72', '#cbd5e1', '#4a5568'],
		emptyCell: '#1c1c2b',
		background: '#11131f',
		surface: '#1c1c2b',
		text: '#cbd5e1',
		textSecondary: '#7d6e83',
		mode: 'dark',
	},
	{
		id: 'ocean',
		name: 'Ocean',
		pieceColors: ['#118ab2', '#06d6a0', '#073b4c', '#5fb0b7', '#0496ff', '#83c5be', '#edf6f9', '#ffd166'],
		emptyCell: '#dceefb',
		background: '#eaf6f8',
		surface: '#ffffff',
		text: '#073b4c',
		textSecondary: '#5fb0b7',
		mode: 'light',
	},
	{
		id: 'autumn',
		name: 'Autumn',
		pieceColors: ['#bc4749', '#dd6e42', '#e8a317', '#a47148', '#6a4c2c', '#8c5e58', '#c97b63', '#e09f3e'],
		emptyCell: '#f3e1c5',
		background: '#fbf3e7',
		surface: '#ffffff',
		text: '#6a4c2c',
		textSecondary: '#bc4749',
		mode: 'light',
	},
	{
		id: 'retro',
		name: 'Retro',
		pieceColors: ['#ff00ff', '#00ffff', '#ffff00', '#39ff14', '#ff5f1f', '#ff1493', '#ffffff', '#7d12ff'],
		emptyCell: '#0d0d0d',
		background: '#000000',
		surface: '#1a1a1a',
		text: '#00ffff',
		textSecondary: '#ff00ff',
		mode: 'dark',
	},
	{
		id: 'mono',
		name: 'Monochrome',
		pieceColors: ['#1a1a1a', '#3d3d3d', '#5e5e5e', '#7f7f7f', '#a0a0a0', '#c1c1c1', '#e2e2e2', '#0d0d0d'],
		emptyCell: '#f5f5f5',
		background: '#fafafa',
		surface: '#ffffff',
		text: '#1a1a1a',
		textSecondary: '#7f7f7f',
		mode: 'light',
	},
	{
		id: 'candy',
		name: 'Candy',
		pieceColors: ['#ff6fb5', '#c77dff', '#7bdff2', '#ffb6e1', '#fff075', '#a0ffe6', '#ffffff', '#caffbf'],
		emptyCell: '#fdf0f7',
		background: '#fff5fb',
		surface: '#ffffff',
		text: '#c77dff',
		textSecondary: '#ff6fb5',
		mode: 'light',
	},
	{
		id: 'forest',
		name: 'Forest',
		pieceColors: ['#2d6a4f', '#40916c', '#74c69d', '#95d5b2', '#588157', '#a3b18a', '#d4a373', '#1b4332'],
		emptyCell: '#e9edc9',
		background: '#f1f7ed',
		surface: '#ffffff',
		text: '#2d6a4f',
		textSecondary: '#74c69d',
		mode: 'light',
	},
]

type Axial = { q: number; r: number }

// Tetrahex shapes, each defined as 4 axial offsets from (0,0), plus a single hexagon
const TETRAHEX_SHAPES: Axial[][] = [
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }], // I
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 2, r: -1 }], // C
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: -1 }], // Y / tripod
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: 1 }, { q: 2, r: 1 }], // S / zigzag
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: 1 }], // rhombus
	[{ q: 0, r: 0 }, { q: 0, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }], // L
	[{ q: 0, r: 0 }], // single hex
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 1, r: -1 }], // C mirrored
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: -1 }, { q: 3, r: -1 }], // S mirrored
	[{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: -1 }, { q: 3, r: -2 }], // L mirrored
]

// Lower weight makes the single hex appear less often than the tetrahex pieces (~6.5% chance)
// S / zigzag and S mirrored are disabled (weight 0) but kept for reference
const SHAPE_WEIGHTS = [37, 37, 30, 0, 37, 37, 18, 37, 0, 37]

const SINGLE_HEX_SHAPE_INDEX = 6

// Maps each shape index to a color index, ensuring no two active shapes share a color
const SHAPE_COLOR_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 3, 3]

function shapeColor(shapeIndex: number, pieceColors: string[]): string {
	return pieceColors[SHAPE_COLOR_INDEX[shapeIndex] % pieceColors.length]
}

function pickShapeIndex(
	excludeSingle: boolean,
	presentShapeIndices: Set<number>,
	boostedShapeIndices: Set<number>,
): number {
	const weightFor = (i: number) => {
		if (excludeSingle && i === SINGLE_HEX_SHAPE_INDEX) return 0
		let w = SHAPE_WEIGHTS[i]
		if (presentShapeIndices.has(i)) w /= 3
		if (boostedShapeIndices.has(i)) w *= 1.1
		return w
	}
	const total = SHAPE_WEIGHTS.reduce((sum, _w, i) => sum + weightFor(i), 0)
	let roll = Math.random() * total
	for (let i = 0; i < SHAPE_WEIGHTS.length; i++) {
		roll -= weightFor(i)
		if (roll < 0) return i
	}
	return SHAPE_WEIGHTS.length - 1
}

// Hex neighbor directions in axial coordinates
const HEX_DIRECTIONS: Axial[] = [
	{ q: 1, r: 0 },
	{ q: 1, r: -1 },
	{ q: 0, r: -1 },
	{ q: -1, r: 0 },
	{ q: -1, r: 1 },
	{ q: 0, r: 1 },
]

// Finds connected groups of empty cells ("holes") on the board
function findHoles(filled: Record<string, string>): Axial[][] {
	const visited = new Set<string>()
	const holes: Axial[][] = []
	for (const cell of ALL_CELLS) {
		const key = `${cell.q},${cell.r}`
		if (filled[key] || visited.has(key)) continue
		const group: Axial[] = []
		const queue: Axial[] = [cell]
		visited.add(key)
		while (queue.length > 0) {
			const c = queue.shift()!
			group.push(c)
			for (const dir of HEX_DIRECTIONS) {
				const nq = c.q + dir.q
				const nr = c.r + dir.r
				const nKey = `${nq},${nr}`
				if (!inGrid(nq, nr) || filled[nKey] || visited.has(nKey)) continue
				visited.add(nKey)
				queue.push({ q: nq, r: nr })
			}
		}
		holes.push(group)
	}
	return holes
}

// Checks whether the given (already-rotated) shape cells fit entirely within a set of cells, allowing translation
function shapeCellsFitInCells(shapeCells: Axial[], cells: Axial[]): boolean {
	const cellSet = new Set(cells.map((c) => `${c.q},${c.r}`))
	for (const origin of cells) {
		const anchor = { q: origin.q - shapeCells[0].q, r: origin.r - shapeCells[0].r }
		if (shapeCells.every((c) => cellSet.has(`${anchor.q + c.q},${anchor.r + c.r}`))) {
			return true
		}
	}
	return false
}

// Checks whether any rotation of the given shape fits entirely within a set of cells
function shapeFitsInCells(shapeIndex: number, cells: Axial[]): boolean {
	let shape = TETRAHEX_SHAPES[shapeIndex]
	for (let rotation = 0; rotation < 6; rotation++) {
		if (shapeCellsFitInCells(shape, cells)) return true
		shape = shape.map(rotate)
	}
	return false
}

// Finds shapes that fit within a 4-8 hex hole on the board, for a small weight boost
function findBoostedShapeIndices(holes: Axial[][]): Set<number> {
	const boosted = new Set<number>()
	for (let shapeIndex = 0; shapeIndex < TETRAHEX_SHAPES.length; shapeIndex++) {
		if (holes.some((hole) => shapeFitsInCells(shapeIndex, hole))) {
			boosted.add(shapeIndex)
		}
	}
	return boosted
}

// Finds which rotations (0-5) of the given shape fit within one of the given holes
function findFittingRotations(shapeIndex: number, holes: Axial[][]): number[] {
	let shape = TETRAHEX_SHAPES[shapeIndex]
	const fitting: number[] = []
	for (let rotation = 0; rotation < 6; rotation++) {
		if (holes.some((hole) => shapeCellsFitInCells(shape, hole))) {
			fitting.push(rotation)
		}
		shape = shape.map(rotate)
	}
	return fitting
}

function rotate(cell: Axial): Axial {
	return { q: -cell.r, r: cell.q + cell.r }
}

function randomPiece(
	pieceColors: string[],
	excludeSingle = false,
	presentShapeIndices: Set<number> = new Set(),
	boostedShapeIndices: Set<number> = new Set(),
	holes: Axial[][] = [],
): { cells: Axial[]; color: string; shapeIndex: number } {
	const shapeIndex = pickShapeIndex(excludeSingle, presentShapeIndices, boostedShapeIndices)
	const shape = TETRAHEX_SHAPES[shapeIndex]
	let rotations = Math.floor(Math.random() * 6)
	if (boostedShapeIndices.has(shapeIndex)) {
		const fittingRotations = findFittingRotations(shapeIndex, holes)
		if (fittingRotations.length > 0) {
			rotations = fittingRotations[Math.floor(Math.random() * fittingRotations.length)]
		}
	}
	let cells = shape
	for (let i = 0; i < rotations; i++) {
		cells = cells.map(rotate)
	}
	const color = shapeColor(shapeIndex, pieceColors)
	return { cells, color, shapeIndex }
}

// Generates a fresh set of pieces, ensuring at most one single-hex piece is present
function randomPieceSet(
	pieceColors: string[],
	filled: Record<string, string> = {},
): { cells: Axial[]; color: string; shapeIndex: number }[] {
	const holes = findHoles(filled).filter((h) => h.length >= 4 && h.length <= 8)
	const boostedShapeIndices = findBoostedShapeIndices(holes)
	const pieces: { cells: Axial[]; color: string; shapeIndex: number }[] = []
	for (let i = 0; i < 3; i++) {
		const hasSingle = pieces.some((p) => p.shapeIndex === SINGLE_HEX_SHAPE_INDEX)
		const presentShapeIndices = new Set(pieces.map((p) => p.shapeIndex))
		pieces.push(randomPiece(pieceColors, hasSingle, presentShapeIndices, boostedShapeIndices, holes))
	}
	return pieces
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

function canPlacePiece(pieceCells: Axial[], filled: Record<string, string>): boolean {
	return ALL_CELLS.some((anchor) =>
		pieceCells.every((c) => {
			const q = anchor.q + c.q
			const r = anchor.r + c.r
			return inGrid(q, r) && !filled[`${q},${r}`]
		}),
	)
}

interface SavedGameState {
	filled: Record<string, string>
	pieces: { cells: Axial[]; color: string; shapeIndex: number }[]
	score: number
}

function loadGameState(): SavedGameState | null {
	try {
		const stored = localStorage.getItem('hexGameState')
		if (!stored) return null
		return JSON.parse(stored) as SavedGameState
	} catch {
		return null
	}
}

interface Dragging {
	pieceIndex: number
	color: string
	shapeIndex: number
	cells: Axial[]
	pointer: { x: number; y: number }
	targetCells: Axial[]
	valid: boolean
	previewClearCells: Axial[]
}

interface ReturningPiece {
	pieceIndex: number
	color: string
	cells: Axial[]
	from: { x: number; y: number }
}

const RETURN_DURATION = 220
const POP_DURATION = 250

function HexGrid() {
	const svgRef = useRef<SVGSVGElement>(null)
	const [filled, setFilled] = useState<Record<string, string>>(() => loadGameState()?.filled ?? {})
	const filledRef = useRef(filled)
	filledRef.current = filled
	const [themeId, setThemeId] = useState(() => localStorage.getItem('hexTheme') ?? THEMES[0].id)
	const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]

	useEffect(() => {
		document.body.style.background = theme.background
	}, [theme.background])
	const [pieces, setPieces] = useState(
		() => loadGameState()?.pieces ?? randomPieceSet(theme.pieceColors, loadGameState()?.filled ?? {}),
	)
	const [dragging, setDragging] = useState<Dragging | null>(null)
	const [returning, setReturning] = useState<ReturningPiece | null>(null)
	const [returningAnimate, setReturningAnimate] = useState(false)
	const [poppingPieces, setPoppingPieces] = useState<Set<number>>(new Set())
	const [score, setScore] = useState(() => loadGameState()?.score ?? 0)
	const [clearingCells, setClearingCells] = useState<Set<string>>(new Set())
	const [highScore, setHighScore] = useState(() => {
		const stored = localStorage.getItem('hexHighScore')
		return stored ? Number(stored) : 0
	})
	const [showSettings, setShowSettings] = useState(false)
	const [showLeaderboard, setShowLeaderboard] = useState(false)
	const [playerName, setPlayerName] = useState(() => localStorage.getItem('hexPlayerName') ?? '')
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
	const [scoreSubmitted, setScoreSubmitted] = useState(false)
	const [submittingScore, setSubmittingScore] = useState(false)

	const selectTheme = (id: string) => {
		const newTheme = THEMES.find((t) => t.id === id) ?? THEMES[0]
		setThemeId(id)
		localStorage.setItem('hexTheme', id)
		setPieces((ps) =>
			ps.map((piece) => ({
				...piece,
				color: shapeColor(piece.shapeIndex, newTheme.pieceColors),
			})),
		)
	}

	useEffect(() => {
		const clearedLines = LINES.filter((line) => line.every((c) => filled[`${c.q},${c.r}`]))
		if (clearedLines.length === 0) return

		const sortedLines = [...clearedLines].sort((a, b) => a.length - b.length)
		let gained = 0
		sortedLines.forEach((line, index) => {
			gained += 100 * line.length * (index + 1)
		})
		setScore((s) => s + gained)

		const clearedKeys = new Set<string>()
		for (const line of clearedLines) {
			for (const c of line) {
				clearedKeys.add(`${c.q},${c.r}`)
			}
		}
		setClearingCells(clearedKeys)

		const timeout = window.setTimeout(() => {
			setFilled((f) => {
				const next = { ...f }
				for (const key of clearedKeys) {
					delete next[key]
				}
				return next
			})
			setClearingCells(new Set())
		}, 250)

		return () => window.clearTimeout(timeout)
	}, [filled])

	useEffect(() => {
		const state: SavedGameState = { filled, pieces, score }
		localStorage.setItem('hexGameState', JSON.stringify(state))
	}, [filled, pieces, score])

	const hasClearableLine = LINES.some((line) => line.every((c) => filled[`${c.q},${c.r}`]))
	const gameOver = !hasClearableLine && pieces.every((piece) => !canPlacePiece(piece.cells, filled))

	useEffect(() => {
		if (!gameOver) return
		setHighScore((h) => {
			if (score <= h) return h
			localStorage.setItem('hexHighScore', String(score))
			return score
		})
	}, [gameOver, score])

	useEffect(() => {
		if (!gameOver) {
			setScoreSubmitted(false)
			return
		}
		fetchLeaderboard().then(setLeaderboard)
	}, [gameOver])

	useEffect(() => {
		if (!showLeaderboard) return
		fetchLeaderboard().then(setLeaderboard)
	}, [showLeaderboard])

	const handleSubmitScore = async () => {
		const name = playerName.trim() || 'Anonymous'
		localStorage.setItem('hexPlayerName', name)
		setSubmittingScore(true)
		await submitScore(name, score)
		const updated = await fetchLeaderboard()
		setLeaderboard(updated)
		setSubmittingScore(false)
		setScoreSubmitted(true)
	}

	const startNewGame = () => {
		setHighScore((h) => {
			if (score <= h) return h
			localStorage.setItem('hexHighScore', String(score))
			return score
		})
		setFilled({})
		setPieces(randomPieceSet(theme.pieceColors))
		setScore(0)
		setDragging(null)
		setReturning(null)
	}

	const resetHighScore = () => {
		setHighScore(0)
		localStorage.removeItem('hexHighScore')
	}

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
		shapeIndex: number,
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
		const targetKeys = new Set(targetCells.map((c) => `${c.q},${c.r}`))
		const previewClearCells = valid
			? LINES.filter((line) =>
					line.every((c) => filledRef.current[`${c.q},${c.r}`] || targetKeys.has(`${c.q},${c.r}`)),
				).flat()
			: []
		return {
			pieceIndex,
			color,
			shapeIndex,
			cells: pieceCells,
			pointer: point,
			targetCells,
			valid,
			previewClearCells,
		}
	}

	const handlePieceDown = (
		pieceIndex: number,
		color: string,
		shapeIndex: number,
		pieceCells: Axial[],
		e: React.PointerEvent,
	) => {
		if (gameOver) return
		const p = toSvgPoint(e)
		setDragging(computeDrag(pieceIndex, color, shapeIndex, pieceCells, p))
	}

	useEffect(() => {
		if (!dragging) return

		const handleMove = (e: PointerEvent) => {
			const p = toSvgPoint(e)
			setDragging((current) => {
				if (!current) return current
				return computeDrag(current.pieceIndex, current.color, current.shapeIndex, current.cells, p)
			})
		}

		const handleUp = () => {
			setDragging((current) => {
				if (!current) return null
				if (current.valid) {
					let nextFilled: Record<string, string> = {}
					setFilled((f) => {
						const next = { ...f }
						for (const c of current.targetCells) {
							next[`${c.q},${c.r}`] = String(current.shapeIndex)
						}
						nextFilled = next
						return next
					})
					const holes = findHoles(nextFilled).filter((h) => h.length >= 4 && h.length <= 8)
					const boostedShapeIndices = findBoostedShapeIndices(holes)
					setPieces((ps) =>
						ps.map((piece, i) => {
							if (i !== current.pieceIndex) return piece
							const hasSingle = ps.some(
								(p, j) => j !== i && p.shapeIndex === SINGLE_HEX_SHAPE_INDEX,
							)
							const presentShapeIndices = new Set(
								ps.filter((_p, j) => j !== i).map((p) => p.shapeIndex),
							)
							return randomPiece(theme.pieceColors, hasSingle, presentShapeIndices, boostedShapeIndices, holes)
						}),
					)
					setPoppingPieces((prev) => new Set(prev).add(current.pieceIndex))
				} else {
					setReturning({
						pieceIndex: current.pieceIndex,
						color: current.color,
						cells: current.cells,
						from: current.pointer,
					})
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

	useEffect(() => {
		if (!returning) return
		setReturningAnimate(false)
		const raf = requestAnimationFrame(() => setReturningAnimate(true))
		const timeout = window.setTimeout(() => {
			setReturning(null)
			setReturningAnimate(false)
		}, RETURN_DURATION)
		return () => {
			cancelAnimationFrame(raf)
			window.clearTimeout(timeout)
		}
	}, [returning])

	useEffect(() => {
		if (poppingPieces.size === 0) return
		const timeout = window.setTimeout(() => {
			setPoppingPieces(new Set())
		}, POP_DURATION)
		return () => window.clearTimeout(timeout)
	}, [poppingPieces])

	const slotCenters = [centerX - gridWidth / 3, centerX, centerX + gridWidth / 3].map((x) => ({
		x,
		y: gridHeight + paletteHeight / 2,
	}))

	return (
		<div className="hex-app" style={{ background: theme.background, transition: 'background 0.2s ease' }}>
			<button
				type="button"
				className="settings-btn"
				aria-label="Settings"
				onClick={() => setShowSettings(true)}
			>
				<img src={gearIcon} alt="" />
			</button>
			<div className="score-panel">
				<div className="score-value" style={{ color: theme.text }}>Score: {score}</div>
				<div className="high-score" style={{ color: theme.textSecondary }}>High Score: {highScore}</div>
			</div>
			{showSettings && (
				<div className="modal-overlay" onClick={() => setShowSettings(false)}>
					<div
						className={`modal${theme.mode === 'dark' ? ' modal-dark' : ''}`}
						style={{ background: theme.surface }}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="modal-title" style={{ color: theme.text }}>
							Settings
						</div>
						<div className="theme-section">
							<div className="theme-label">Theme</div>
							<div className="theme-options">
								{THEMES.map((t) => (
									<button
										key={t.id}
										type="button"
										className={`theme-swatch${t.id === themeId ? ' selected' : ''}`}
										aria-label={t.name}
										onClick={() => selectTheme(t.id)}
									>
										<span className="theme-swatch-colors">
											{t.pieceColors.slice(0, 4).map((c, i) => (
												<span key={i} className="theme-swatch-dot" style={{ background: c }} />
											))}
										</span>
										<span className="theme-swatch-name">{t.name}</span>
									</button>
								))}
							</div>
						</div>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => {
								startNewGame()
								setShowSettings(false)
							}}
						>
							Restart Game
						</button>
						{isLeaderboardConfigured() && (
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => {
									setShowSettings(false)
									setShowLeaderboard(true)
								}}
							>
								View Leaderboard
							</button>
						)}
						<button type="button" className="btn btn-danger" onClick={resetHighScore}>
							Reset High Score
						</button>
						<button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>
							Close
						</button>
					</div>
				</div>
			)}
			{showLeaderboard && (
				<div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
					<div
						className={`modal${theme.mode === 'dark' ? ' modal-dark' : ''}`}
						style={{ background: theme.surface }}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="modal-title" style={{ color: theme.text }}>
							Leaderboard
						</div>
						{leaderboard.length > 0 ? (
							<div className="leaderboard-list">
								{leaderboard.map((entry, i) => (
									<div key={i} className="leaderboard-row">
										<span>{i + 1}. {entry.name}</span>
										<span>{entry.score}</span>
									</div>
								))}
							</div>
						) : (
							<div className="modal-score">No scores yet.</div>
						)}
						<button type="button" className="btn btn-secondary" onClick={() => setShowLeaderboard(false)}>
							Close
						</button>
					</div>
				</div>
			)}
			{gameOver && (
				<div className="modal-overlay">
					<div className={`modal${theme.mode === 'dark' ? ' modal-dark' : ''}`} style={{ background: theme.surface }}>
						<div className="modal-title danger">Game Over</div>
						<div className="modal-score">Score: {score}</div>
						<div className="modal-score">High Score: {highScore}</div>
						{isLeaderboardConfigured() && (
							<div className="leaderboard-section">
								{!scoreSubmitted ? (
									<div className="leaderboard-submit">
										<input
											type="text"
											className="leaderboard-name-input"
											placeholder="Your name"
											maxLength={20}
											value={playerName}
											onChange={(e) => setPlayerName(e.target.value)}
										/>
										<button
											type="button"
											className="btn btn-primary"
											disabled={submittingScore}
											onClick={handleSubmitScore}
										>
											{submittingScore ? 'Submitting...' : 'Submit Score'}
										</button>
									</div>
								) : (
									<div className="leaderboard-label">Score submitted!</div>
								)}
								{leaderboard.length > 0 && (
									<div className="leaderboard-list">
										<div className="leaderboard-label">Leaderboard</div>
										{leaderboard.map((entry, i) => (
											<div key={i} className="leaderboard-row">
												<span>
													{i + 1}. {entry.name}
												</span>
												<span>{entry.score}</span>
											</div>
										))}
									</div>
								)}
							</div>
						)}
						<button type="button" className="btn btn-primary" onClick={startNewGame}>
							New Game
						</button>
					</div>
				</div>
			)}
			<svg
			ref={svgRef}
			viewBox={`0 0 ${width} ${height}`}
			style={{ touchAction: 'none', width: '100%', maxWidth: width, height: 'auto' }}
		>
			{cellPixels.map((c) => (
				<polygon
					key={`${c.q},${c.r}`}
					points={hexPoints(c.x, c.y, HEX_SIZE)}
					fill={
						filled[`${c.q},${c.r}`] !== undefined
							? shapeColor(Number(filled[`${c.q},${c.r}`]), theme.pieceColors)
							: theme.emptyCell
					}
					stroke="#333"
					strokeWidth={1}
				/>
			))}

			{cellPixels
				.filter((c) => clearingCells.has(`${c.q},${c.r}`))
				.map((c) => (
					<polygon
						key={`clear-${c.q},${c.r}`}
						className="cell-clear-overlay"
						points={hexPoints(c.x, c.y, HEX_SIZE)}
						fill="#ffffff"
						pointerEvents="none"
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

			{dragging &&
				dragging.previewClearCells.map((c, i) => {
					const { x, y } = axialToPixel(c.q, c.r, HEX_SIZE)
					return (
						<polygon
							key={`preview-clear-${i}`}
							points={hexPoints(centerX + x, centerY + y, HEX_SIZE)}
							fill="#ffffff"
							stroke="none"
							opacity={0.35}
							pointerEvents="none"
							style={{ transition: 'opacity 0.1s ease' }}
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
						className={poppingPieces.has(i) ? 'piece-pop' : undefined}
						style={{ cursor: 'grab' }}
						onPointerDown={(e) => handlePieceDown(i, piece.color, piece.shapeIndex, piece.cells, e)}
					>
						<rect
							x={slot.x - (maxX - minX) / 2 - PALETTE_HEX_SIZE * 1.5}
							y={slot.y - (maxY - minY) / 2 - PALETTE_HEX_SIZE * 1.5}
							width={maxX - minX + PALETTE_HEX_SIZE * 3}
							height={maxY - minY + PALETTE_HEX_SIZE * 3}
							fill="transparent"
							style={{ pointerEvents: 'all' }}
						/>
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

				{returning &&
					(() => {
						const pixels = returning.cells.map((c) => axialToPixel(c.q, c.r, HEX_SIZE))
						const centroidX = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length
						const centroidY = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length
						const slot = slotCenters[returning.pieceIndex]
						const scale = PALETTE_HEX_SIZE / HEX_SIZE
						const target = returningAnimate
							? { x: slot.x, y: slot.y, scale, opacity: 0 }
							: { x: returning.from.x, y: returning.from.y, scale: 1, opacity: 0.85 }
						return (
							<g
								pointerEvents="none"
								style={{
									transform: `translate(${target.x}px, ${target.y}px) scale(${target.scale})`,
									opacity: target.opacity,
									transition: `transform ${RETURN_DURATION}ms ease, opacity ${RETURN_DURATION}ms ease`,
								}}
							>
								{pixels.map((p, i) => (
									<polygon
										key={i}
										points={hexPoints(p.x - centroidX, p.y - centroidY, HEX_SIZE)}
										fill={returning.color}
										stroke="#333"
										strokeWidth={1}
									/>
								))}
							</g>
						)
					})()}
			</svg>
		</div>
	)
}

export default HexGrid
