export interface UserRegisterDto {
	osuUsername: string;
	osuId: number;
}

export interface UserDto {
	id: string;
	osuUsername: string;
	osuId: number;
	defaultMode: 'osu' | 'taiko' | 'fruits' | 'mania';
	role: 'default' | 'admin';
	avatarUrl: string;
	createdAt: string;
	updatedAt: string;
}

export interface AuthenticatedUserDto {
	token: string;
}
