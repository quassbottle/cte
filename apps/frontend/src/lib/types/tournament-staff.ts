import type { TournamentParticipantDto } from '$lib/api/types';

export type TournamentStaffRole = {
	 id: string;
	name: string;
	canParticipate: boolean;
	 members: TournamentParticipantDto[];
};
