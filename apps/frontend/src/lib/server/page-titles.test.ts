import { describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const route = (path: string) => resolve(import.meta.dir, '../../routes', path);

describe('page titles', () => {
	it('defines document titles for primary pages', async () => {
		const pages = [
			['+page.svelte', 'CTE - Home'],
			['events/+page.svelte', 'CTE - Events'],
			['events/[slug]/+page.svelte', 'CTE - {data.tournament.name}'],
			['events/[slug]/edit/+page.svelte', 'CTE - Edit {data.tournament.name}'],
			['events/create/+page.svelte', 'CTE - Create event'],
			['users/[slug]/+page.svelte', "CTE - {user ? `${user.osuUsername}'s profile` : 'Profile'}"],
		] as const;

		for (const [file, title] of pages) {
			const source = await readFile(route(file), 'utf8');

			expect(source).toContain('<svelte:head>');
			expect(source).toContain(`<title>${title}</title>`);
		}
	});
});
