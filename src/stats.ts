const STATS_KEY = 'hexStats'

export interface Stats {
	piecesPlaced: number
	linesCleared: number
	gamesPlayed: number
	bestMoveLines: number
	bestMovePoints: number
}

const DEFAULT_STATS: Stats = {
	piecesPlaced: 0,
	linesCleared: 0,
	gamesPlayed: 0,
	bestMoveLines: 0,
	bestMovePoints: 0,
}

export function loadStats(): Stats {
	try {
		const stored = localStorage.getItem(STATS_KEY)
		if (!stored) return { ...DEFAULT_STATS }
		return { ...DEFAULT_STATS, ...JSON.parse(stored) }
	} catch {
		return { ...DEFAULT_STATS }
	}
}

export function saveStats(stats: Stats): void {
	localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}
