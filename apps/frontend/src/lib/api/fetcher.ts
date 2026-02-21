import { PUBLIC_API_URL } from '$env/static/public';
import type { ApiResponse, DomainError } from './types';

export const fetcherFactory = () => {
	const url = new URL(PUBLIC_API_URL);

	return async <TBody, TSuccess, TError = unknown>(params: {
		method: THttpMethod;
		route: string;
		headers: THeaders;
		body?: TBody;
		query?: URLSearchParams;
	}) => {
		const { method, route, headers, body, query } = params;

		const fullUrl = new URL(url);
		fullUrl.pathname = route;

		for (const searchParam of query ?? []) {
			fullUrl.searchParams.append(searchParam[0], searchParam[1]);
		}

		return apiRequest<TBody, TSuccess, TError>({
			method,
			url: fullUrl.toString(),
			headers,
			body
		});
	};
};

export type TApiFetcher<TSuccess, TBody = unknown, TError = DomainError> = (params: {
	method: THttpMethod;
	route: string;
	headers: THeaders;
	body?: TBody;
	query?: URLSearchParams;
}) => Promise<ApiResponse<TSuccess, TError>>;

export type THttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type THeaders = Record<string, string | undefined>;

const apiRequest = async <TBody, TSuccess, TError>(params: {
	method: THttpMethod;
	url: string;
	headers: THeaders;
	body?: TBody;
}): Promise<ApiResponse<TSuccess, TError | DomainError>> => {
	const { method, url, headers, body } = params;

	const response = await fetch(url, {
		method,
		headers: Object.fromEntries(
			Object.entries(headers).filter(([, value]) => value !== undefined)
		) as Record<string, string>,
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
	const payload = isJson ? await response.json() : undefined;

	if (!response.ok) {
		const domainError = {
			status: response.status,
			message:
				(payload as { message?: string } | undefined)?.message ?? response.statusText ?? 'Request failed',
			errorCode: (payload as { errorCode?: string } | undefined)?.errorCode
		} satisfies DomainError;

		return {
			success: false,
			error: domainError as TError | DomainError
		};
	}

	return {
		success: true,
		result: payload as TSuccess
	};
};
