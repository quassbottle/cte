import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { normalizeOpenApiDocument } from './openapi/normalize';

const openApiUrl = process.env.BACKEND_OPENAPI_URL ?? 'http://127.0.0.1:3000/docs-json';
const outputPath = resolve(import.meta.dir, '../openapi/backend.json');

const response = await fetch(openApiUrl, {
	headers: {
		accept: 'application/json'
	}
});

if (!response.ok) {
	throw new Error(`Unable to fetch OpenAPI schema: ${response.status} ${response.statusText}`);
}

const schema = normalizeOpenApiDocument(await response.json());
const serialized = `${JSON.stringify(schema, null, 2)}\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized, 'utf8');

console.info(`OpenAPI schema written to ${outputPath}`);
