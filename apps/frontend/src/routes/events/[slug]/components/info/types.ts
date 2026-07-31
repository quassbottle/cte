import type { SelectedUser } from '$lib/schemas/user.schema';

export type TournamentRegistrationForm =
	| {
			deleteError?: string;
			registrationError?: string;
			teamName?: string;
			selectedUsers?: SelectedUser[];
	  }
	| undefined;
