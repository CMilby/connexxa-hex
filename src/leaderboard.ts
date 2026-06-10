const URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL
const TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN

const LEADERBOARD_KEY = 'hex-leaderboard'

export interface LeaderboardEntry {
	name: string
	score: number
}

export function isLeaderboardConfigured(): boolean {
	return Boolean(URL && TOKEN)
}

async function command(...args: (string | number)[]): Promise<unknown> {
	const path = args.map((a) => encodeURIComponent(String(a))).join('/')
	const res = await fetch(`${URL}/${path}`, {
		headers: { Authorization: `Bearer ${TOKEN}` },
	})
	const data = await res.json()
	return data.result
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
	if (!isLeaderboardConfigured()) return []
	const result = (await command('zrevrange', LEADERBOARD_KEY, 0, limit - 1, 'withscores')) as string[]
	const entries: LeaderboardEntry[] = []
	for (let i = 0; i < result.length; i += 2) {
		entries.push({ name: result[i], score: Number(result[i + 1]) })
	}
	return entries
}

export async function submitScore(name: string, score: number): Promise<void> {
	if (!isLeaderboardConfigured()) return
	await command('zadd', LEADERBOARD_KEY, 'GT', score, name)
}
