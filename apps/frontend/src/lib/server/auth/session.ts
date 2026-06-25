import { createBackendClient } from '$lib/server/backend/client';
import { backendErrorStatus } from '$lib/server/backend/errors';
import type { UserDto } from '$lib/api/generated/model';
import type { Viewer } from '$lib/types/viewer';

export type SessionToken = {
	token: string;
};

export type ServerSession = SessionToken & {
	user: Viewer;
};

type CookieReader = {
	get(name: string): string | undefined;
};

type CookieRemover = {
	delete(name: string, options: { path: string }): void;
};

type RequestFetch = typeof globalThis.fetch;
type GetViewer = (token: string, requestFetch?: RequestFetch) => Promise<Viewer>;

const getViewerFromBackend: GetViewer = async (token, requestFetch) => {
	const response = await createBackendClient({ token, fetch: requestFetch }).users.me();

	return toViewer(response.data);
};

const toViewer = (user: UserDto): Viewer => ({
	...user,
	avatarUrl: `https://a.ppy.sh/${user.osuId}`
});

export const readSession = (cookies: CookieReader): SessionToken | null => {
	const token = cookies.get('session');
	return token ? { token } : null;
};

export const loadViewer = async (
	session: SessionToken | null,
	cookies: CookieRemover,
	getViewer: GetViewer = getViewerFromBackend,
	requestFetch?: RequestFetch
): Promise<Viewer | null> => {
	if (!session) return null;

	try {
		return await getViewer(session.token, requestFetch);
	} catch (error) {
		if (backendErrorStatus(error) === 401) {
			cookies.delete('session', { path: '/' });
			return null;
		}

		throw error;
	}
};

export const resolveSession = async (
	cookies: CookieReader & CookieRemover,
	getViewer: GetViewer = getViewerFromBackend,
	requestFetch?: RequestFetch
): Promise<ServerSession | null> => {
	const session = readSession(cookies);
	const user = await loadViewer(session, cookies, getViewer, requestFetch);

	return session && user ? { ...session, user } : null;
};
