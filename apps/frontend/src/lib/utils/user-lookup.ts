import { selectedUserSchema, type SelectedUser } from '$lib/schemas/user.schema';

export async function lookupSelectedUser(query: string): Promise<SelectedUser> {
	const value = query.trim();
	if (!value) {
		throw new Error('Enter osu id, osu username, or local id.');
	}

	try {
		const response = await fetch(`/api/users/lookup?${new URLSearchParams({ query: value })}`);
		if (!response.ok) {
			throw new Error('User not found.');
		}

		return selectedUserSchema.parse(await response.json());
	} catch {
		throw new Error('User not found.');
	}
}
