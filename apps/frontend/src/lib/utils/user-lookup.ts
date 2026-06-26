import { userControllerGetByLookup } from '$lib/api/generated/browser-client';
import type { SelectedUser } from '$lib/schemas/user.schema';
import { getAvatarUrlByOsuId } from '$lib/utils/osu';

export async function lookupSelectedUser(query: string): Promise<SelectedUser> {
	const value = query.trim();
	if (!value) {
		throw new Error('Enter osu id, osu username, or local id.');
	}

	try {
		const response = await userControllerGetByLookup({ query: value });
		if (response.status < 200 || response.status >= 300) {
			throw new Error('User not found.');
		}

		return {
			id: response.data.id,
			osuId: response.data.osuId,
			osuUsername: response.data.osuUsername,
			avatarUrl: getAvatarUrlByOsuId(response.data.osuId)
		};
	} catch {
		throw new Error('User not found.');
	}
}
