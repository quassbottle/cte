import type { Cookies } from '@sveltejs/kit';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const SESSION_COOKIE = 'session';

export const setOAuthStateCookie = (cookies: Cookies, state: string, secure: boolean) => {
	cookies.set(OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure,
		sameSite: 'lax',
		path: '/auth',
		maxAge: 10 * 60
	});
};

export const setSessionCookie = (cookies: Cookies, token: string, secure: boolean) => {
	cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure,
		sameSite: 'lax',
		path: '/',
		maxAge: 24 * 60 * 60
	});
};

export const removeCookie = (cookies: Cookies, name: string, path: string) => {
	cookies.delete(name, { path });
};
