/**
 * Generative banner feature.
 *
 * Public surface intentionally small: stable entity id → deterministic
 * pattern → SSR-safe SVG data URL. Split across three layers:
 *
 *   - `rng`        — seeded PRNG (FNV-1a hash + sfc32).
 *   - `palette`    — colour model and harmony rules.
 *   - `pattern`    — pure algorithm: seed → serialisable draw ops (cached).
 *   - `svg`        — pure string → SVG document / data URL (cached). No DOM.
 *
 * No module here touches the DOM; the entire feature is SSR-safe.
 */

export { createRng, hashString } from './rng';
export { createPalette, hsl } from './palette';
export type { Palette } from './palette';
export { generatePattern, type PatternOp, type PatternResult, type ShapeKind } from './pattern';
export { patternToSVG, patternToDataURL } from './svg';
