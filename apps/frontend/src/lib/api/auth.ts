import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
import pkg from 'jsonwebtoken';
import type { UserSession } from './types';
const { verify } = pkg;

export const authenticateUser = async (event: RequestEvent) => {
	const { cookies } = event;

	const userToken = cookies.get('session');

	if (!userToken) return null;

	try {
		const secret = env.JWT_SECRET;
		if (!secret) return null;

		const user = verify(userToken, secret) as UserSession;
		return { id: user.id, token: userToken };
	} catch {
		return null;
	}
};
