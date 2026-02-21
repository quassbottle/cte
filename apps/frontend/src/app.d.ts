// See https://kit.svelte.dev/docs/types#app

import type { UserSession } from "$lib/api/types";

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: UserSession | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
