import { defineConfig } from 'orval';

export default defineConfig({
	backend: {
		input: {
			target: './openapi/backend.json'
		},
		output: {
			mode: 'split',
			target: './src/lib/server/backend/generated/endpoints.ts',
			schemas: './src/lib/server/backend/generated/model',
			client: 'fetch',
			clean: true,
			prettier: true,
			override: {
				mutator: {
					path: './src/lib/server/backend/fetcher.ts',
					name: 'backendFetch'
				}
			}
		}
	}
});
