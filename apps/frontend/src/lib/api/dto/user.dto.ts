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
	createdAt: Date;
	updatedAt: Date;
}

export interface AuthenticatedUserDto {
	token: string;
}
