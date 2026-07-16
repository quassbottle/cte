import * as cuid2 from '@paralleldrive/cuid2';
import z from 'zod';

export const qualificationLobbyIdSchema = z
  .cuid2()
  .brand('QualificationLobbyId');

export type QualificationLobbyId = z.infer<typeof qualificationLobbyIdSchema>;

const cuid = cuid2.init({ length: 24 });

export const qualificationLobbyId = () => cuid() as QualificationLobbyId;
