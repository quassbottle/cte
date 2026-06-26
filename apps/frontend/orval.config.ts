import { defineConfig } from 'orval';

export default defineConfig({
	backend: {
		input: {
			target: './openapi/backend.json'
		},
		output: {
			mode: 'split',
			target: './src/lib/server/backend/generated/endpoints.ts',
			schemas: './src/lib/api/generated/model',
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
	},
	browserApi: {
		input: {
			target: './openapi/backend.json'
		},
		output: {
			mode: 'single',
			target: './src/lib/api/generated/browser-client.ts',
			schemas: './src/lib/api/generated/model',
			client: 'fetch',
			clean: false,
			prettier: true
		}
	}
});
