import { describe, expect, it } from 'bun:test';
import { debounce } from './debounce';

describe('debounce', () => {
	it('runs only the latest call after the delay', async () => {
		const values: string[] = [];
		const run = debounce((value: string) => values.push(value), 10);

		run('first');
		run('second');
		await Bun.sleep(20);

		expect(values).toEqual(['second']);
	});
});
