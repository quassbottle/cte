import type { TokenDto } from "./token.dto"

export interface UserRegisterDto {
  username: string
  osuId: number
  osuRefreshToken: string
  osuAccessToken: string
  osuAccessTokenExpiresAt: Date
}

export interface UserDto {
  id: string
  username: string
  osuId: number
  createdAt: Date
}

export interface UserAuthenticatedDto extends UserDto {
  token: TokenDto
}