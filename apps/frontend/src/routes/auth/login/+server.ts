import { setOAuthStateCookie } from '$lib/server/auth/cookies';
import { createBackendClient } from '$lib/server/backend/client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const state = crypto.randomUUID();
	const loginUrl = new URL(await createBackendClient({ fetch }).auth.getLoginUrl());
	loginUrl.searchParams.set('state', state);

	setOAuthStateCookie(cookies, state, process.env.NODE_ENV === 'production');

	throw redirect(302, loginUrl.toString());
};
