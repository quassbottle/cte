// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			osuUser?: {
				id: number;
				username?: string;
			};
		}
		interface PageData {
			osuUser?: {
				id: number;
				username?: string | null;
			} | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
