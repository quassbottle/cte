import { Request } from 'express';

export interface TokenPayload {
  id: string;
}

export type RequestWithAuth<
  TUser = TokenPayload,
  TParams extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
  TBody = unknown,
  TQuery = Record<string, unknown>,
> = Request<TParams, unknown, TBody, TQuery> & { user: TUser };
