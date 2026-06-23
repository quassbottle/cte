export type Viewer = {
	id: string;
	osuId: number;
	osuUsername: string;
	role: 'default' | 'admin';
	avatarUrl: string;
	createdAt: string;
	updatedAt: string;
};
