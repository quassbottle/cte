export enum OsuApiMode {
  Osu = 'osu',
  Taiko = 'taiko',
  Fruits = 'fruits',
  Mania = 'mania',
}

export type OsuUserClient = {
  users: {
    getSelf(params?: {
      urlParams?: { mode?: OsuApiMode };
    }): Promise<OsuUserProfile>;
  };
};

export type OsuUserProfile = {
  id: number;
  username: string;
  country_code?: string | null;
  cover_url?: string | null;
  playmode?: string | null;
  statistics?: {
    pp?: number | null;
    global_rank?: number | null;
  } | null;
  error?: unknown;
};

export type OsuMatchSnapshot = {
  closedAt: Date | null;
  games: OsuMatchGame[];
};

export type OsuMatchGame = {
  id: number;
  beatmapId: number;
  endedAt: Date | null;
  scores: {
    userId: number;
    score: number;
    team: 'red' | 'blue' | null;
    mods: string[];
    maxCombo: number;
    accuracy: number;
    rank: string;
    great: number;
    ok: number;
    miss: number;
  }[];
};

export type OsuBeatmapDetails = {
  id: number;
  beatmapset_id: number;
  mode: OsuApiMode;
  difficulty_rating: number;
  version: string;
  ranked: number;
  beatmapset: {
    artist: string;
    title: string;
  };
  error?: unknown;
};

export type OsuUserDetails = {
  id: number;
  username: string;
  countryCode: string | null;
};
