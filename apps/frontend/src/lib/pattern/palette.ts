/**
 * Colour palette model and generation rules for the generative banner feature.
 *
 * Pure, framework-agnostic, deterministic: a given PRNG produces the same palette.
 */

export type Palette = {
	readonly bg: string;
	readonly tile: string;
	readonly muted: string;
	readonly accent: string;
	readonly accent2: string;
	readonly light: string;
};

/** Formats an HSL colour as a CSS `hsl(h s% l%)` string. */
export function hsl(h: number, s: number, l: number): string {
	return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

/**
 * Builds a palette from a PRNG. A base hue is chosen at random, then a
 * complementary background hue; accents are harmonically offset from the base.
 *
 * The consume order from `rand` must remain stable to preserve determinism:
 *   1. base hue
 *   2. background hue jitter
 */
export function createPalette(rand: () => number): Palette {
	const hue = Math.floor(rand() * 360);
	const bgHue = (hue + 180 + (rand() * 24 - 12) + 360) % 360;

	return {
		bg: hsl(bgHue, 8, 18),
		tile: hsl(bgHue, 6, 28),
		muted: hsl(bgHue, 5, 38),
		accent: hsl(hue, 42, 52),
		accent2: hsl((hue + 32) % 360, 48, 56),
		light: hsl((hue + 58) % 360, 52, 64)
	};
}