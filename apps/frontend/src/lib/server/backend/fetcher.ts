type BackendRequestErrorOptions = {
	status: number;
	message: string;
	body: unknown;
	url: string;
	cause?: unknown;
};

export class BackendRequestError extends Error {
	public readonly status: number;
	public readonly body: unknown;
	public readonly url: string;

	public constructor({ status, message, body, url, cause }: BackendRequestErrorOptions) {
		super(message, { cause });
		this.name = 'BackendRequestError';
		this.status = status;
		this.body = body;
		this.url = url;
	}
}

type BackendRequestInit = RequestInit & {
	fetch?: typeof globalThis.fetch;
};

export async function backendFetch<T>(path: string, init: BackendRequestInit = {}): Promise<T> {
	const baseUrl = process.env.BACKEND_API_URL;
	const { fetch: requestFetch = globalThis.fetch, ...requestInit } = init;

	if (!baseUrl) {
		throw new Error('BACKEND_API_URL is not set');
	}

	const url = new URL(path, baseUrl);
	let response: Response;

	try {
		response = await requestFetch(url, requestInit);
	} catch (cause) {
		throw new BackendRequestError({
			status: 502,
			message: 'Backend is unavailable',
			body: null,
			url: url.toString(),
			cause
		});
	}

	const contentType = response.headers.get('content-type') ?? '';
	const rawBody = response.status === 204 ? undefined : await response.text();
	let body: unknown = rawBody;

	if (rawBody && contentType.includes('application/json')) {
		try {
			body = JSON.parse(rawBody);
		} catch {
			// Preserve malformed backend responses for diagnostics instead of masking their status.
		}
	}

	if (!response.ok) {
		throw new BackendRequestError({
			status: response.status,
			message:
				typeof body === 'object' &&
				body !== null &&
				'message' in body &&
				typeof body.message === 'string'
					? body.message
					: response.statusText || 'Backend request failed',
			body,
			url: url.toString()
		});
	}

	return {
		data: body,
		status: response.status,
		headers: response.headers
	} as T;
}
