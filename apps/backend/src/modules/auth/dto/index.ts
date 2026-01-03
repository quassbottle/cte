import { createZodDto } from 'nestjs-zod/dto';
import z from 'zod';

export const loginDtoSchema = z.object({
  code: z.string().min(1).describe('Authorization code from osu! OAuth2'),
});

export class LoginDto extends createZodDto(loginDtoSchema) {}
