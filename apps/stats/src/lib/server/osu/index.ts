import { env } from '$env/dynamic/private';
import { auth, type auth_scopes } from 'osu-api-extended';

const clientId = Number(env.OSU_CLIENT_ID);
const clientSecret = env.OSU_CLIENT_SECRET;
const redirectUrl = env.OSU_REDIRECT_URL;

if (!clientId || Number.isNaN(clientId)) {
	throw new Error('OSU_CLIENT_ID is not set');
}

if (!clientSecret) {
	throw new Error('OSU_CLIENT_SECRET is not set');
}

if (!redirectUrl) {
	throw new Error('OSU_REDIRECT_URL is not set');
}

export const buildOsuAuthorizeUrl = (state?: string) =>
	auth.build_url({
		client_id: clientId,
		redirect_url: redirectUrl,
		scopes: ['identify'] as unknown as auth_scopes,
		state
	});

export const exchangeCodeForTokens = (code: string) =>
	auth.authorize({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_url: redirectUrl
	});

export type OsuOAuthUser = {
	id: number;
	username?: string;
};

export type OsuOAuthResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	scope?: string[] | string;
	id?: number;
	username?: string;
	user?: { id?: number; username?: string; name?: string };
};
