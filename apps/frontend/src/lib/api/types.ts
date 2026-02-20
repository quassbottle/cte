export type UserSession = {
	id: string;
	osuId: number;
	token: string;
};

export interface ApiResponse<TResult, TError = undefined> {
	success: boolean;
	error: TError;
	result: TResult;
}

export interface DomainError {
	status: number;
	message: string;
}

export * from './dto/match.dto';
export * from './dto/stage.dto';
export * from './dto/token.dto';
export * from './dto/tournament.dto';
export * from './dto/user.dto';
