import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Vite only exposes VITE_-prefixed env vars by default.
	// Load all env vars from .env and populate process.env so
	// server-side code using process.env works during dev.
	const env = loadEnv(mode, process.cwd(), '');
	for (const [key, value] of Object.entries(env)) {
		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}

	return {
		plugins: [sveltekit()]
	};
});
