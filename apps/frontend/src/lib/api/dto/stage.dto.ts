export interface StageDto {
	id: string;
	name: string;
	type: 'regular' | 'qualification';
	tournamentId: string;
	startsAt: string;
	endsAt: string;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface StageCreateDto {
	name: string;
	startsAt: Date | string;
	endsAt: Date | string;
}

export interface StageUpdateDto {
	name?: string;
	startsAt?: Date | string;
	endsAt?: Date | string;
}
