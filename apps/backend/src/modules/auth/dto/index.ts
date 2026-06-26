import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const loginDtoSchema = z.object({
  code: z.string().min(1).describe('Authorization code from osu! OAuth2'),
});

export const authUrlDtoSchema = z.object({
  url: z.url(),
});

export const authTokenDtoSchema = z.object({
  token: z.string().min(1),
});

export class LoginDto extends createZodDto(loginDtoSchema) {}
export class AuthUrlDto extends createZodDto(authUrlDtoSchema) {}
export class AuthTokenDto extends createZodDto(authTokenDtoSchema) {}
