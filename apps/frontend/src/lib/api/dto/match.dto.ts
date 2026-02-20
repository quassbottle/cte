import { UserDto } from "./user.dto"

export interface MatchDto {
  id: string
  player1Id: string
  player2Id: string
  winnerId: string
  startDate: Date
  endDate: Date
}

export interface MatchCreateDto {
  player1Id: string
  player2Id: string
  winnerId: string
  startDate: Date
  endDate: Date
  stageId: string
}

export interface MatchUpdateDto {
  player1Id?: string
  player2Id?: string
  winnerId?: string
  startDate?: Date
  endDate?: Date
}

export interface MatchPlayerDto extends UserDto {
  score: number
}