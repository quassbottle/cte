import { describe, expect, it } from 'bun:test';
import { readdir } from 'node:fs/promises';
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
	it('keeps generated and BFF code under src/lib/server', async () => {
		const serverRoot = resolve(import.meta.dir);
		const files = await collectFiles(serverRoot);

		expect(files.some((file) => file.includes('/backend/generated/'))).toBe(true);
		expect(files.some((file) => file.includes('/bff/'))).toBe(true);
		expect(files.every((file) => file.startsWith(serverRoot))).toBe(true);
	});
});
