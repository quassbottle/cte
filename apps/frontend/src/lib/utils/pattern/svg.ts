/**
 * SVG rendering for the pattern module — 1:1 port of `generator.html`.
 *
 * Pure string manipulation; no DOM access; runs identically on server and
 * client. Produces a `data:` URL safe for `<img src=...>`.
 */

import type { OsuMode } from '../../api/types';
import type { PatternResult, PatternOp, RotatedShapeKind } from './pattern';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Renders a {@link PatternResult} as a self-contained SVG document string.
 */
export function patternToSVG(pattern: PatternResult): string {
	const { width, height, palette, ops } = pattern;

	const parts: string[] = [];
	parts.push(
		`<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="geometricPrecision">`
	);
	parts.push(`<rect width="${width}" height="${height}" fill="${palette.bg}"/>`);

	let clipCounter = 0;
	for (const op of ops) {
		if (op.kind === 'fillCell') {
			parts.push(fillCellSVG(op));
		} else if (op.kind === 'modeIcon') {
			parts.push(modeIconSVG(op));
		} else {
			parts.push(shapeSVG(op as Extract<PatternOp, { kind: RotatedShapeKind }>, clipCounter++));
		}
	}

	parts.push('</svg>');
	return parts.join('');
}

function fillCellSVG(op: Extract<PatternOp, { kind: 'fillCell' }>): string {
	const overlap = 1;
	return `<rect x="${op.px}" y="${op.py}" width="${op.cell + overlap}" height="${op.cell + overlap}" fill="${op.color}"/>`;
}

function shapeSVG(op: Extract<PatternOp, { kind: RotatedShapeKind }>, clipId: number): string {
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

const MODE_ICON_SVG: Record<OsuMode, { viewBox: number; body: string }> = {
	osu: {
		viewBox: 64,
		body:
			'<path d="M62 32C62 48.5685 48.5685 62 32 62C15.4315 62 2 48.5685 2 32C2 15.4315 15.4315 2 32 2C48.5685 2 62 15.4315 62 32Z" fill="none" stroke="currentColor" stroke-width="4"/>' +
			'<path d="M54 32C54 44.1503 44.1503 54 32 54C19.8497 54 10 44.1503 10 32C10 19.8497 19.8497 10 32 10C44.1503 10 54 19.8497 54 32Z" fill="currentColor" stroke="currentColor" stroke-width="4"/>'
	},
	taiko: {
		viewBox: 53,
		body: '<path d="M27 12V41M51 26.5C51 40.031 40.031 51 26.5 51C12.969 51 2 40.031 2 26.5C2 12.969 12.969 2 26.5 2C40.031 2 51 12.969 51 26.5ZM42 26.5C42 35.0604 35.0604 42 26.5 42C17.9396 42 11 35.0604 11 26.5C11 17.9396 17.9396 11 26.5 11C35.0604 11 42 17.9396 42 26.5Z" fill="none" stroke="currentColor" stroke-width="4"/>'
	},
	fruits: {
		viewBox: 53,
		body:
			'<path d="M22 15C23.6569 15 25 16.3431 25 18C25 19.6569 23.6569 21 22 21C20.3431 21 19 19.6569 19 18C19 16.3431 20.3431 15 22 15Z" fill="currentColor" stroke="currentColor" stroke-width="4"/>' +
			'<path d="M34 24C35.6569 24 37 25.3431 37 27C37 28.6569 35.6569 30 34 30C32.3431 30 31 28.6569 31 27C31 25.3431 32.3431 24 34 24Z" fill="currentColor" stroke="currentColor" stroke-width="4"/>' +
			'<path d="M22 32C23.6569 32 25 33.3431 25 35C25 36.6569 23.6569 38 22 38C20.3431 38 19 36.6569 19 35C19 33.3431 20.3431 32 22 32Z" fill="currentColor" stroke="currentColor" stroke-width="4"/>' +
			'<path d="M26.5 2C40.031 2 51 12.969 51 26.5C51 40.031 40.031 51 26.5 51C12.969 51 2 40.031 2 26.5C2 12.969 12.969 2 26.5 2Z" fill="none" stroke="currentColor" stroke-width="4"/>'
	},
	mania: {
		viewBox: 53,
		body:
			'<path d="M26.5 2C40.031 2 51 12.969 51 26.5C51 40.031 40.031 51 26.5 51C12.969 51 2 40.031 2 26.5C2 12.969 12.969 2 26.5 2Z" fill="none" stroke="currentColor" stroke-width="4"/>' +
			'<rect x="13" y="17" width="7" height="20" rx="3.5" fill="currentColor"/>' +
			'<rect x="23" y="9" width="7" height="36" rx="3.5" fill="currentColor"/>' +
			'<rect x="33" y="17" width="7" height="20" rx="3.5" fill="currentColor"/>'
	}
};

function modeIconSVG(op: Extract<PatternOp, { kind: 'modeIcon' }>): string {
	const icon = MODE_ICON_SVG[op.mode];
	const scale = op.cell / icon.viewBox;

	return `<g transform="translate(${op.px} ${op.py}) scale(${scale})" color="${op.color}" shape-rendering="geometricPrecision">${icon.body}</g>`;
}

function triangleSVG(px: number, py: number, s: number, color: string, deg: number): string {
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

function plusSVG(px: number, py: number, s: number, color: string, deg: number): string {
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
			parts.push(`<circle cx="${px + ix * gap}" cy="${py + iy * gap}" r="${r}" fill="${color}"/>`);
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

/**
 * Renders a {@link PatternResult} to a `data:image/svg+xml,...` URL string.
 * Deterministic and SSR-safe (no DOM access). Cached per `seed:width:height`.
 */
export function patternToDataURL(pattern: PatternResult): string {
	const cacheKey = `${pattern.seed}:${pattern.width}x${pattern.height}:${pattern.mode ?? 'none'}`;
	const cached = dataURLCache.get(cacheKey);
	if (cached) return cached;

	const svg = patternToSVG(pattern);
	const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
	dataURLCache.set(cacheKey, url);
	return url;
}
