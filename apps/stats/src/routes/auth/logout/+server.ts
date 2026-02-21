import { dev } from '/environment';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './';

const cookieBase = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const
};

const KEYS = ['osu_access_token', 'osu_refresh_token', 'osu_user_id', 'osu_user_name'];

export const GET: RequestHandler = ({ cookies, url }) => {
	for (const key of KEYS) {
		cookies.delete(key, cookieBase);
	}

	const redirectTo = url.searchParams.get('redirectTo') ?? '/';
	throw redirect(302, redirectTo);
};
