/**
 * Seeded pseudo-random number generator utilities.
 *
 * Framework-agnostic, side-effect free, runs identically on server and client.
 * Used to derive deterministic generative banners from a stable entity id.
 */

/**
 * FNV-1a 32-bit hash. Deterministic for any given string across all JS runtimes.
 * Returns an unsigned 32-bit integer used to seed the PRNG.
 */
export function hashString(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/**
 * Small fast counter 32-bit PRNG (sfc32). Given the same seed, returns the
 * same sequence of uint32-derived floats in the half-open range [0, 1).
 */
export function createRng(seed: string | number): () => number {
	let s = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;

	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}