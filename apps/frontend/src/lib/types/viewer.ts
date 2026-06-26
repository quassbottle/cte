export type Viewer = {
	id: string;
	osuId: number;
	osuUsername: string;
	osuCoverUrl: string | null;
	defaultMode: 'osu' | 'taiko' | 'fruits' | 'mania';
	role: 'default' | 'admin';
	avatarUrl: string;
	createdAt: string;
	updatedAt: string;
};
