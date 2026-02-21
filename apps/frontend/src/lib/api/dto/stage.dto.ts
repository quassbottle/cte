export interface StageDto {
	id: string;
	name: string;
	tournamentId: string;
	startsAt: Date;
	endsAt: Date;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
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
