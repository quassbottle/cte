export type BackendRequestError = {
	status: number;
	message: string;
	body: unknown;
};

type BackendRequestInit = RequestInit & {
	fetch?: typeof globalThis.fetch;
};

export async function backendFetch<T>(path: string, init: BackendRequestInit = {}): Promise<T> {
	const baseUrl = process.env.BACKEND_API_URL;
	const { fetch: requestFetch = globalThis.fetch, ...requestInit } = init;

	if (!baseUrl) {
		throw new Error('BACKEND_API_URL is not set');
	}

	const response = await requestFetch(new URL(path, baseUrl), requestInit);
	const contentType = response.headers.get('content-type') ?? '';
	const body =
		response.status === 204
			? undefined
			: contentType.includes('application/json')
				? await response.json()
				: await response.text();

	if (!response.ok) {
		throw {
			status: response.status,
			message:
				typeof body === 'object' &&
				body !== null &&
				'message' in body &&
				typeof body.message === 'string'
					? body.message
					: response.statusText || 'Backend request failed',
			body
		} satisfies BackendRequestError;
	}

	return {
		data: body,
		status: response.status,
		headers: response.headers
	} as T;
}
