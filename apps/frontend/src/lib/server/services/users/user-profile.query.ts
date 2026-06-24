import type { BackendClient } from '$lib/server/backend/client';

export async function getUserProfile(backend: BackendClient, userId: string) {
	return (await backend.users.getById(userId)).data;
}
