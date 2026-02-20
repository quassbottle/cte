import { authorize } from './authorize';
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
		users: () => users(headers),
		authorize: () => authorize(headers)
	});
};
