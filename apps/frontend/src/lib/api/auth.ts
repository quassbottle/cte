import { JWT_SECRET } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';
import pkg from 'jsonwebtoken';
import type { UserSession } from './types';
const { verify } = pkg;

export const authenticateUser = async (event: RequestEvent) => {
	const { cookies } = event;

	const userToken = cookies.get('session');

	if (!userToken) return null;

	try {
		const user = verify(userToken, JWT_SECRET) as UserSession;
		return { id: user.id, token: userToken };
	} catch {
		return null;
	}
};
