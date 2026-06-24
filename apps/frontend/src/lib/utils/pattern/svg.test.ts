import { describe, expect, test } from 'bun:test';
import { patternToSVG } from './svg';
import type { PatternResult } from './pattern';

describe('patternToSVG', () => {
	test('renders mode icons across the full pattern cell', () => {
		const svg = patternToSVG({
			seed: 'mode-icon-size',
			width: 120,
			height: 120,
			mode: 'taiko',
			palette: {
				bg: '#000',
				tile: '#111',
				muted: '#222',
				light: '#333',
				accent: '#444',
				accent2: '#555'
			},
			ops: [{ kind: 'modeIcon', px: 10, py: 20, cell: 53, color: '#fff', mode: 'taiko' }]
		} satisfies PatternResult);

		expect(svg).toContain('transform="translate(10 20) scale(1)"');
	});

	test('renders mode icons without a separate background fill', () => {
		const svg = patternToSVG({
			seed: 'mode-icon-fill',
			width: 120,
			height: 120,
			mode: 'taiko',
			palette: {
				bg: '#000',
				tile: '#111',
				muted: '#222',
				light: '#333',
				accent: '#444',
				accent2: '#555'
			},
			ops: [{ kind: 'modeIcon', px: 0, py: 0, cell: 53, color: '#fff', mode: 'taiko' }]
		} satisfies PatternResult);

		expect(svg).not.toContain('data-mode-icon-fill');
		expect(svg).not.toContain('opacity=');
	});

	test('keeps mode-specific logo paths instead of replacing them with generic shapes', () => {
		const svg = patternToSVG({
			seed: 'mode-icon-shape',
			width: 120,
			height: 120,
			mode: 'taiko',
			palette: {
				bg: '#000',
				tile: '#111',
				muted: '#222',
				light: '#333',
				accent: '#444',
				accent2: '#555'
			},
			ops: [{ kind: 'modeIcon', px: 0, py: 0, cell: 53, color: '#fff', mode: 'taiko' }]
		} satisfies PatternResult);

		expect(svg).toContain('M27 12V41');
		expect(svg).toContain('fill="none" stroke="currentColor"');
		expect(svg).not.toContain('<circle cx="26.5" cy="26.5" r="24.5"');
	});

	test('renders the fruits logo outline plus fruit dots', () => {
		const svg = patternToSVG({
			seed: 'mode-icon-fruits',
			width: 120,
			height: 120,
			mode: 'fruits',
			palette: {
				bg: '#000',
				tile: '#111',
				muted: '#222',
				light: '#333',
				accent: '#444',
				accent2: '#555'
			},
			ops: [{ kind: 'modeIcon', px: 0, py: 0, cell: 53, color: '#fff', mode: 'fruits' }]
		} satisfies PatternResult);

		expect(svg).toContain('M26.5 2C40.031 2');
		expect(svg).toContain('M22 15C23.6569 15');
		expect(svg).not.toContain('data-mode-icon-fill');
	});
});
