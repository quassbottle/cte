import {
	OAUTH_STATE_COOKIE,
	SESSION_COOKIE,
	removeCookie,
	setSessionCookie
} from '$lib/server/auth/cookies';
import { createBackendClient } from '$lib/server/backend/client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, fetch, url }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get(OAUTH_STATE_COOKIE);

	removeCookie(cookies, OAUTH_STATE_COOKIE, '/auth');

	if (!code || !state || !storedState || state !== storedState) {
		throw redirect(303, '/?authError=oauth_state');
	}

	try {
		const token = await createBackendClient({ fetch }).auth.exchangeCode(code);
		setSessionCookie(cookies, token, process.env.NODE_ENV === 'production');
	} catch (cause) {
		console.error('[Auth] oauth_exchange failed:', cause);
		removeCookie(cookies, SESSION_COOKIE, '/');
		throw redirect(303, '/?authError=oauth_exchange');
	}

	throw redirect(303, '/');
};
