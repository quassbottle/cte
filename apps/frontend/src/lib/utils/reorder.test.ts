import { describe, expect, test } from 'bun:test';
import { moveItem } from './reorder';

describe('moveItem', () => {
	test('moves an item up', () => {
		expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
	});

	test('moves an item down', () => {
		expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
	});

	test('keeps the original order when source and target match', () => {
		expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
	});
});
