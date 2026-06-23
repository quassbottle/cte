import { SESSION_COOKIE, removeCookie } from '$lib/server/auth/cookies';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	removeCookie(cookies, SESSION_COOKIE, '/');
	throw redirect(303, '/');
};
