import { redirect } from '@sveltejs/kit';
import { NODE_ENV } from '$env/static/private';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const code = url.searchParams.get('code')!;

	const { success, result } = await api().authorize().oauth(code);

	if (!success) {
		cookies.delete('session', { path: '/' });

		throw redirect(303, '/');
	}

	cookies.set('session', result.token.accessToken, {
		secure: NODE_ENV === 'production',
		sameSite: 'strict',
		path: '/',
		maxAge: 60 * 60 * 24 * 1
	});

	throw redirect(303, '/');
};

export const ssr = true;
export const prerender = false;
