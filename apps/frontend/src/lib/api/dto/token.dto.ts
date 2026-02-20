export interface TokenDto {
  accessToken: string
  expiresAt: Date
}

export interface TokenPayload {
  id: string,
  osuId: number
}