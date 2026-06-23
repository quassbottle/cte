export interface UserRegisterDto {
	osuUsername: string;
	osuId: number;
}

export interface UserDto {
	id: string;
	osuUsername: string;
	osuId: number;
	role: 'default' | 'admin';
	avatarUrl: string;
	createdAt: string;
	updatedAt: string;
}

export interface AuthenticatedUserDto {
	token: string;
}
