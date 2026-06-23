/**
 * SVG rendering for the pattern module — 1:1 port of `generator.html`.
 *
 * Pure string manipulation; no DOM access; runs identically on server and
 * client. Produces a `data:` URL safe for `<img src=...>`.
 */

import type { PatternResult, PatternOp, ShapeKind } from './pattern';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Renders a {@link PatternResult} as a self-contained SVG document string.
 */
export function patternToSVG(pattern: PatternResult): string {
	const { width, height, palette, ops } = pattern;

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
	);
	parts.push(`<rect width="${width}" height="${height}" fill="${palette.bg}"/>`);

	let clipCounter = 0;
	for (const op of ops) {
		if (op.kind === 'fillCell') {
			parts.push(fillCellSVG(op));
		} else {
			parts.push(shapeSVG(op as Extract<PatternOp, { kind: ShapeKind }>, clipCounter++));
		}
	}

	parts.push('</svg>');
	return parts.join('');
}

function fillCellSVG(op: Extract<PatternOp, { kind: 'fillCell' }>): string {
	const overlap = 1;
	return `<rect x="${op.px}" y="${op.py}" width="${op.cell + overlap}" height="${op.cell + overlap}" fill="${op.color}"/>`;
}

function shapeSVG(op: Extract<PatternOp, { kind: ShapeKind }>, clipId: number): string {
	const { px, py, cell: s, color, rotation } = op;
	const deg = (rotation * 180) / Math.PI;

	switch (op.kind) {
		case 'triangle':
			return triangleSVG(px, py, s, color, deg);
		case 'circle':
			return circleSVG(px, py, s, color);
		case 'square':
			return squareSVG(px, py, s, color);
		case 'plus':
			return plusSVG(px, py, s, color, deg);
		case 'dots':
			return dotsSVG(px, py, s, color);
		case 'stripes':
			return stripesSVG(px, py, s, color, deg, clipId);
	}
}

function triangleSVG(
	px: number,
	py: number,
	s: number,
	color: string,
	deg: number
): string {
	const half = s / 2;
	return `<g transform="translate(${px + half} ${py + half}) rotate(${deg})" fill="${color}"><polygon points="${-half},${half} ${half},${half} 0,${-half}"/></g>`;
}

function circleSVG(px: number, py: number, s: number, color: string): string {
	const r = s * 0.34;
	return `<circle cx="${px + s / 2}" cy="${py + s / 2}" r="${r}" fill="${color}"/>`;
}

function squareSVG(px: number, py: number, s: number, color: string): string {
	const p = s * 0.22;
	return `<rect x="${px + p}" y="${py + p}" width="${s - p * 2}" height="${s - p * 2}" fill="${color}"/>`;
}

function plusSVG(
	px: number,
	py: number,
	s: number,
	color: string,
	deg: number
): string {
	const w = s * 0.16;
	const l = s * 0.68;
	return `<g transform="translate(${px + s / 2} ${py + s / 2}) rotate(${deg + 45})" fill="${color}"><rect x="${-w / 2}" y="${-l / 2}" width="${w}" height="${l}"/><rect x="${-l / 2}" y="${-w / 2}" width="${l}" height="${w}"/></g>`;
}

function dotsSVG(px: number, py: number, s: number, color: string): string {
	const r = s * 0.045;
	const gap = s / 4;
	const parts: string[] = [];
	for (let iy = 1; iy <= 3; iy++) {
		for (let ix = 1; ix <= 3; ix++) {
			parts.push(
				`<circle cx="${px + ix * gap}" cy="${py + iy * gap}" r="${r}" fill="${color}"/>`
			);
		}
	}
	return parts.join('');
}

function stripesSVG(
	px: number,
	py: number,
	s: number,
	color: string,
	deg: number,
	clipId: number
): string {
	const parts: string[] = [];
	const barW = s * 0.1;
	for (let i = -s * 1.5; i < s * 1.5; i += s * 0.26) {
		parts.push(
			`<rect x="${i}" y="${-s * 1.5}" width="${barW}" height="${s * 3}" fill="${color}"/>`
		);
	}
	return (
		`<clipPath id="clip${clipId}"><rect x="${px}" y="${py}" width="${s}" height="${s}"/></clipPath>` +
		`<g clip-path="url(#clip${clipId})" transform="translate(${px + s / 2} ${py + s / 2}) rotate(${deg + 45})" fill="${color}">${parts.join('')}</g>`
	);
}

const dataURLCache = new Map<string, string>();

const BANNER_RENDER_WIDTH = 1200;
const BANNER_RENDER_HEIGHT = 260;

/**
 * Renders a {@link PatternResult} to a `data:image/svg+xml,...` URL string.
 * Deterministic and SSR-safe (no DOM access). Cached per `seed:width:height`.
 */
export function patternToDataURL(
	pattern: PatternResult,
	width: number = BANNER_RENDER_WIDTH,
	height: number = BANNER_RENDER_HEIGHT
): string {
	const cacheKey = `${pattern.seed}:${pattern.width}x${pattern.height}`;
	const cached = dataURLCache.get(cacheKey);
	if (cached) return cached;

	const svg = patternToSVG(pattern);
	const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
	dataURLCache.set(cacheKey, url);
	return url;
}