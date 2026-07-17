import { BackendRequestError } from '$lib/server/backend/fetcher';
import { error } from '@sveltejs/kit';

export const hasBackendStatus = (cause: unknown): cause is Pick<BackendRequestError, 'status'> =>
	typeof cause === 'object' &&
	cause !== null &&
	'status' in cause &&
	typeof cause.status === 'number';

export const isBackendRequestError = (cause: unknown): cause is BackendRequestError =>
	cause instanceof BackendRequestError;

export const backendErrorStatus = (cause: unknown, fallback = 400) =>
	hasBackendStatus(cause) ? cause.status : fallback;

export const backendErrorMessage = (cause: unknown, fallback: string) =>
	isBackendRequestError(cause) ? cause.message : fallback;

export const throwBackendError = (
	cause: unknown,
	fallbackStatus: number,
	fallbackMessage: string
): never => {
	const status = backendErrorStatus(cause, fallbackStatus);
	if (status >= 500) throw cause;
	throw error(status, backendErrorMessage(cause, fallbackMessage));
};
