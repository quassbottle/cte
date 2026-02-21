import { dev } from '$app/environment';
import { type OsuOAuthResponse, exchangeCodeForTokens } from '$lib/server/osu';
import { type RequestHandler, error, redirect } from '@sveltejs/kit';

const STATE_COOKIE = 'osu_oauth_state';

const cookieBase = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const
};

const pickUser = (payload: OsuOAuthResponse) => {
	const id = payload.id ?? payload.user?.id ?? null;
	const username = payload.username ?? payload.user?.username ?? payload.user?.name ?? null;

	return { id, username } as const;
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get(STATE_COOKIE);

	if (!code) {
		throw error(400, 'Missing authorization code');
	}

	if (!state || !storedState || state !== storedState) {
		throw error(400, 'Invalid state, please retry login');
	}

	cookies.delete(STATE_COOKIE, { path: '/' });

	let tokens: OsuOAuthResponse;

	try {
		tokens = await exchangeCodeForTokens(code);
	} catch (err) {
		console.error('osu oauth exchange failed', err);
		throw error(502, 'Unable to complete osu! login');
	}

	if (!tokens?.access_token) {
		throw error(502, 'osu! did not return an access token');
	}

	const accessMaxAge = tokens.expires_in ? Math.max(tokens.expires_in - 60, 300) : 3600;

	cookies.set('osu_access_token', tokens.access_token, {
		...cookieBase,
		maxAge: accessMaxAge
	});

	if (tokens.refresh_token) {
		cookies.set('osu_refresh_token', tokens.refresh_token, {
			...cookieBase,
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});
	}

	const user = pickUser(tokens);

	if (user.id) {
		cookies.set('osu_user_id', String(user.id), {
			...cookieBase,
			maxAge: accessMaxAge
		});
	}

	if (user.username) {
		cookies.set('osu_user_name', user.username, {
			...cookieBase,
			maxAge: accessMaxAge
		});
	}

	throw redirect(302, '/');
};
