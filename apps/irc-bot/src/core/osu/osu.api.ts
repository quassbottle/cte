import { Nullable } from 'core/utils/types';
import { OsuApiResponse, OsuErrorResponse } from './osu.types';
import { isError, osuRequestBody } from './osu.utils';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const apiRequest = async <T>(params: {
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  body?: Nullable<Record<string, string | number>> | Nullable<string>;
}) => {
  const { method, url, headers, body } = params;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? (body as unknown as BodyInit) : undefined,
  });

  return response.json() as T;
};

export const osuApiRequest = async <TResponse>(params: {
  method: HTTPMethod;
  resource: string;
  body?: Record<string, string | number>;
  headers?: Record<string, string>;
}): Promise<OsuApiResponse<TResponse>> => {
  const { method, resource, headers, body } = params;

  const requestUrl = new URL(`https://osu.ppy.sh/`);
  requestUrl.pathname = resource;

  const osuBody = body ? osuRequestBody(body) : null;

  const response = await apiRequest<TResponse>({
    method,
    url: requestUrl.toString(),
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: osuBody,
  });

  if (isError(response)) {
    return {
      success: false,
      error: response as OsuErrorResponse,
    };
  }
  return {
    success: true,
    result: response as TResponse,
  };
};
