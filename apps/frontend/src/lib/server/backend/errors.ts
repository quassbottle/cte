import type { BackendRequestError } from '$lib/server/backend/fetcher';

export const hasBackendStatus = (cause: unknown): cause is Pick<BackendRequestError, 'status'> =>
	typeof cause === 'object' &&
	cause !== null &&
	'status' in cause &&
	typeof cause.status === 'number';

export const isBackendRequestError = (cause: unknown): cause is BackendRequestError =>
	hasBackendStatus(cause) && 'message' in cause && typeof cause.message === 'string';

export const backendErrorStatus = (cause: unknown, fallback = 400) =>
	hasBackendStatus(cause) ? cause.status : fallback;

export const backendErrorMessage = (cause: unknown, fallback: string) =>
	isBackendRequestError(cause) ? cause.message : fallback;
