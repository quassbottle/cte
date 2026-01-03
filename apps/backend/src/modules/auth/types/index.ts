import { Request } from 'express';

export interface TokenPayload {
  id: string;
}

export type RequestWithAuth<TUser = TokenPayload> = Request & { user: TUser };
