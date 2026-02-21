import { dev } from '$app/environment';
import { buildOsuAuthorizeUrl } from '$lib/server/osu';
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

const STATE_COOKIE = 'osu_oauth_state';

export const GET: RequestHandler = ({ cookies }) => {
	const state = randomUUID();
	const authorizeUrl = buildOsuAuthorizeUrl(state);

	cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes to finish login
	});

	throw redirect(302, authorizeUrl);
};
