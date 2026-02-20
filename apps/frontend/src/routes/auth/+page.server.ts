import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const oauthError = url.searchParams.get('error');

	if (!code || oauthError) {
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/');
	}

	const { success, result } = await api().authorize().oauth(code);

	if (!success || !result) {
		cookies.delete('session', { path: '/' });

		throw redirect(303, '/');
	}

	cookies.set('session', result.token, {
		secure: !dev,
		sameSite: 'strict',
		path: '/',
		maxAge: 60 * 60 * 24 * 1
	});

	throw redirect(303, '/');
};

export const ssr = true;
export const prerender = false;
