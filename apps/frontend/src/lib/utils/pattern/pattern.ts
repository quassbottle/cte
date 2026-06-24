/**
 * Deterministic pattern algorithm — 1:1 port of `generator.html`.
 *
 * Produces a square-grid layout with per-cell fill + optional shape.
 * Pure, framework-agnostic, cache-friendly; never touches the DOM.
 */

import type { Palette } from './palette';
import type { OsuMode } from '../../api/types';
import { createPalette } from './palette';
import { createRng } from './rng';

export type RotatedShapeKind = 'triangle' | 'circle' | 'square' | 'plus' | 'dots' | 'stripes';
export type ShapeKind = RotatedShapeKind | 'modeIcon';

export type PatternOp =
	| {
			readonly kind: 'fillCell';
			readonly px: number;
			readonly py: number;
			readonly cell: number;
			readonly color: string;
	  }
	| {
			readonly kind: RotatedShapeKind;
			readonly px: number;
			readonly py: number;
			readonly cell: number;
			readonly color: string;
			readonly rotation: number;
	  }
	| {
			readonly kind: 'modeIcon';
			readonly px: number;
			readonly py: number;
			readonly cell: number;
			readonly color: string;
			readonly mode: OsuMode;
	  };

export type PatternResult = {
	readonly seed: string;
	readonly width: number;
	readonly height: number;
	readonly mode?: OsuMode;
	readonly palette: Palette;
	readonly ops: readonly PatternOp[];
};

const SHAPE_KINDS: readonly RotatedShapeKind[] = [
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
export function generatePattern(
	seed: string,
	width: number,
	height: number,
	mode?: OsuMode
): PatternResult {
	const cacheKey = `${seed}:${width}x${height}:${mode ?? 'none'}`;
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
	const shapeKinds: readonly ShapeKind[] = mode ? [...SHAPE_KINDS, 'modeIcon'] : SHAPE_KINDS;
	const ops: PatternOp[] = [];
	let hasModeIcon = false;

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const px = offsetX + col * cell;
			const py = offsetY + row * cell;

			const tileColor = rand() < 0.5 ? palette.bg : palette.tile;
			ops.push({ kind: 'fillCell', px, py, cell, color: tileColor });

			if (rand() < SKIP_PROB) continue;

			const kind = shapeKinds[Math.floor(rand() * shapeKinds.length)];
			const color = colors[Math.floor(rand() * colors.length)];

			if (kind === 'modeIcon') {
				if (!mode) continue;
				hasModeIcon = true;
				ops.push({ kind, px, py, cell, color, mode });
			} else {
				const rotation = Math.floor(rand() * 4) * (Math.PI / 2);
				ops.push({ kind, px, py, cell, color, rotation });
			}
		}
	}

	if (mode && !hasModeIcon) {
		const fallbackColor = colors[Math.floor(rand() * colors.length)];
		ops.push({
			kind: 'modeIcon',
			px: offsetX + Math.floor(cols / 2) * cell,
			py: offsetY + Math.floor(rows / 2) * cell,
			cell,
			color: fallbackColor,
			mode
		});
	}

	const result: PatternResult = { seed, width, height, mode, palette, ops };
	resultCache.set(cacheKey, result);
	return result;
}
