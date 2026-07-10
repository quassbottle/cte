import { describe, expect, it } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function collectFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const path = resolve(directory, entry.name);
			return entry.isDirectory() ? collectFiles(path) : [path];
		})
	);

	return nested.flat();
}

describe('server-only infrastructure boundaries', () => {
	it('keeps generated backend code under src/lib/server', async () => {
		const serverRoot = resolve(import.meta.dir);
		const files = await collectFiles(serverRoot);

		expect(files.some((file) => file.includes('/backend/generated/'))).toBe(true);
		expect(files.every((file) => file.startsWith(serverRoot))).toBe(true);
	});

	it('prevents browser-facing code from importing the generated NestJS client', async () => {
		const sourceRoot = resolve(import.meta.dir, '../..');
		const browserRoots = [
			resolve(sourceRoot, 'routes'),
			resolve(sourceRoot, 'lib/components'),
			resolve(sourceRoot, 'lib/utils')
		];
		const files = (await Promise.all(browserRoots.map(collectFiles)))
			.flat()
			.filter(
				(file) =>
					/\.(svelte|ts)$/.test(file) &&
					!file.endsWith('.server.ts') &&
					!file.endsWith('/+server.ts')
			);
		const violations: string[] = [];

		for (const file of files) {
			const source = await readFile(file, 'utf8');
			if (source.includes('$lib/server/backend')) {
				violations.push(file);
			}
		}

		expect(violations).toEqual([]);
	});
});
