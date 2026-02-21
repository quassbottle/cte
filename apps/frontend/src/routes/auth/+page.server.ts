import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api/api';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const oauthError = url.searchParams.get('error');
	const isHttps = url.protocol === 'https:';

	console.info('[auth-callback] incoming', {
		path: url.pathname,
		isHttps,
		hasCode: Boolean(code),
		hasOauthError: Boolean(oauthError)
	});

	if (!code || oauthError) {
		console.warn('[auth-callback] early-exit', {
			reason: !code ? 'missing_code' : 'oauth_error',
			oauthError
		});
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/');
	}

	const { success, result } = await api().authorize().oauth(code);
	const hasToken = Boolean(result && 'token' in result && result.token);

	console.info('[auth-callback] oauth-result', {
		success,
		hasResult: Boolean(result),
		hasToken
	});

	if (!success || !result) {
		console.warn('[auth-callback] oauth-failed', {
			success,
			hasResult: Boolean(result)
		});
		cookies.delete('session', { path: '/' });

		throw redirect(303, '/');
	}

	console.info('[auth-callback] setting-session-cookie', {
		secure: !dev && isHttps,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24
	});

	cookies.set('session', result.token, {
		secure: !dev && isHttps,
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60 * 24 * 1
	});

	console.info('[auth-callback] redirecting-home');

	throw redirect(303, '/');
};

export const ssr = true;
export const prerender = false;
