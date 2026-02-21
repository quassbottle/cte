import type { UserDto } from './user.dto';

export interface MatchDto {
	id: string;
	name: string;
	creatorId: string;
	startsAt: Date;
	endsAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface MatchWithParticipantsDto extends MatchDto {
	participants: UserDto[];
}
