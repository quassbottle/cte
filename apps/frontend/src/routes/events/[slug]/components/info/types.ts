import type { SelectedUser } from '$lib/schemas/user.schema';

export type TournamentRegistrationForm =
	| {
			registrationError?: string;
			teamName?: string;
			selectedUsers?: SelectedUser[];
	  }
	| undefined;
