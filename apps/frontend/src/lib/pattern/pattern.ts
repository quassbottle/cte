/**
 * Deterministic pattern algorithm — 1:1 port of `generator.html`.
 *
 * Produces a square-grid layout with per-cell fill + optional shape.
 * Pure, framework-agnostic, cache-friendly; never touches the DOM.
 */

import type { Palette } from './palette';
import { createPalette } from './palette';
import { createRng } from './rng';

export type ShapeKind = 'triangle' | 'circle' | 'square' | 'plus' | 'dots' | 'stripes';

export type PatternOp =
	| {
			readonly kind: 'fillCell';
			readonly px: number;
			readonly py: number;
			readonly cell: number;
			readonly color: string;
	  }
	| {
			readonly kind: ShapeKind;
			readonly px: number;
			readonly py: number;
			readonly cell: number;
			readonly color: string;
			readonly rotation: number;
	  };

export type PatternResult = {
	readonly seed: string;
	readonly width: number;
	readonly height: number;
	readonly palette: Palette;
	readonly ops: readonly PatternOp[];
};

const SHAPE_KINDS: readonly ShapeKind[] = [
	'triangle',
	'circle',
	'square',
	'plus',
	'dots',
	'stripes'
];

const SKIP_PROB = 0.16;
const TARGET_CELL = 90;

const resultCache = new Map<string, PatternResult>();

/**
 * Generates (or returns cached) pattern data for the given seed at the given
 * canvas dimensions. The seed is combined with `width:height` so the same
 * tournament produces a different (but still deterministic) layout for
 * different banner sizes.
 */
export function generatePattern(seed: string, width: number, height: number): PatternResult {
	const cacheKey = `${seed}:${width}x${height}`;
	const cached = resultCache.get(cacheKey);
	if (cached) return cached;

	const rand = createRng(`${seed}:${width}x${height}`);
	const palette = createPalette(rand);

	const cols = Math.max(3, Math.ceil(width / TARGET_CELL));
	const rows = Math.max(3, Math.ceil(height / TARGET_CELL));
	const cell = Math.ceil(Math.max(width / cols, height / rows));

	const gridW = cell * cols;
	const gridH = cell * rows;
	const offsetX = Math.round((width - gridW) / 2);
	const offsetY = Math.round((height - gridH) / 2);

	const colors = [palette.accent, palette.accent2, palette.light, palette.tile, palette.muted];
	const ops: PatternOp[] = [];

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const px = offsetX + col * cell;
			const py = offsetY + row * cell;

			const tileColor = rand() < 0.5 ? palette.bg : palette.tile;
			ops.push({ kind: 'fillCell', px, py, cell, color: tileColor });

			if (rand() < SKIP_PROB) continue;

			const kind = SHAPE_KINDS[Math.floor(rand() * SHAPE_KINDS.length)];
			const color = colors[Math.floor(rand() * colors.length)];
			const rotation = Math.floor(rand() * 4) * (Math.PI / 2);

			ops.push({ kind, px, py, cell, color, rotation });
		}
	}

	const result: PatternResult = { seed, width, height, palette, ops };
	resultCache.set(cacheKey, result);
	return result;
}