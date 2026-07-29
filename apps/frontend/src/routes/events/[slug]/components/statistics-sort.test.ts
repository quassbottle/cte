import { describe, expect, test } from 'bun:test';
import { statisticsSortHref, statisticsViewHref } from './statistics-sort';

describe('statisticsSortHref', () => {
	test('toggles a map desc, asc, desc', () => {
		const initial = new URL('https://cte.test/events/twc?tab=statistics&stage=stage');
		const desc = statisticsSortHref(initial, 11);
		const asc = statisticsSortHref(new URL(desc, initial), 11);
		const descAgain = statisticsSortHref(new URL(asc, initial), 11);

		expect(new URL(desc, initial).searchParams.get('sortDirection')).toBe('desc');
		expect(new URL(asc, initial).searchParams.get('sortDirection')).toBe('asc');
		expect(new URL(descAgain, initial).searchParams.get('sortDirection')).toBe('desc');
	});

	test('toggles seed asc, desc, asc', () => {
		const initial = new URL('https://cte.test/events/twc?tab=statistics&stage=stage');
		const desc = statisticsSortHref(initial, null);
		const asc = statisticsSortHref(new URL(desc, initial), null);

		expect(new URL(desc, initial).searchParams.get('sortDirection')).toBe('desc');
		expect(new URL(asc, initial).searchParams.get('sortDirection')).toBe('asc');
	});

	test('switches to players and resets sorting', () => {
		const initial = new URL(
			'https://cte.test/events/twc?tab=statistics&stage=stage&sortBeatmapId=11&sortDirection=desc'
		);
		const result = new URL(statisticsViewHref(initial, 'players'), initial);

		expect(result.searchParams.get('view')).toBe('players');
		expect(result.searchParams.get('stage')).toBe('stage');
		expect(result.searchParams.has('sortBeatmapId')).toBe(false);
		expect(result.searchParams.has('sortDirection')).toBe(false);
	});

	test('switches back to teams without a view parameter', () => {
		const initial = new URL(
			'https://cte.test/events/twc?tab=statistics&stage=stage&view=players'
		);
		const result = new URL(statisticsViewHref(initial, 'teams'), initial);

		expect(result.searchParams.has('view')).toBe(false);
	});
});
