// See https://kit.svelte.dev/docs/types#app

import type { ServerSession } from '$lib/server/auth/session';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: ServerSession | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
