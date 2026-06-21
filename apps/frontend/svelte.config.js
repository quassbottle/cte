import adapter from '@eslym/sveltekit-adapter-bun';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			out: 'build',
			bundler: 'bun',
			serveStatic: true,
			sourceMap: true
		}),
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;
