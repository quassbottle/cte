export interface StageDto {
  id: string
  name: string
  tournamentId: string
}

export interface StageCreateDto {
  name: string
  tournamentId: string
}

export interface StageUpdateDto {
  name?: string
}