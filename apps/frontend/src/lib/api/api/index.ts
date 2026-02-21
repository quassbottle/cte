import { osu } from './osu';
import { authorize } from './authorize';
import { mappools } from './mappools';
import { stages } from './stages';
import { tournaments } from './tournaments';
import { users } from './users';

export const api = (params?: { token?: string }) => {
	const { token } = params ?? { token: undefined };

	const headers = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
		Authorization: token ? `Bearer ${token}` : undefined
	};

	return Object.freeze({
		tournaments: () => tournaments(headers),
		stages: () => stages(headers),
		mappools: () => mappools(headers),
		users: () => users(headers),
		osu: () => osu(headers),
		authorize: () => authorize(headers)
	});
};
