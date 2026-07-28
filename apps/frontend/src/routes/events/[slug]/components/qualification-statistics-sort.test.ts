import { describe, expect, test } from 'bun:test';
import { qualificationSortHref } from './qualification-statistics-sort';

describe('qualificationSortHref', () => {
	test('toggles a map desc, asc, desc', () => {
		const initial = new URL('https://cte.test/events/twc?tab=qualification');
		const desc = qualificationSortHref(initial, 11);
		const asc = qualificationSortHref(new URL(desc, initial), 11);
		const descAgain = qualificationSortHref(new URL(asc, initial), 11);

		expect(new URL(desc, initial).searchParams.get('sortDirection')).toBe('desc');
		expect(new URL(asc, initial).searchParams.get('sortDirection')).toBe('asc');
		expect(new URL(descAgain, initial).searchParams.get('sortDirection')).toBe('desc');
	});

	test('toggles seed asc, desc, asc', () => {
		const initial = new URL('https://cte.test/events/twc?tab=qualification');
		const desc = qualificationSortHref(initial, null);
		const asc = qualificationSortHref(new URL(desc, initial), null);

		expect(new URL(desc, initial).searchParams.get('sortDirection')).toBe('desc');
		expect(new URL(asc, initial).searchParams.get('sortDirection')).toBe('asc');
	});
});
