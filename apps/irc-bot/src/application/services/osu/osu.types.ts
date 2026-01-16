export type OsuAuthResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
};

export interface OsuMatch {
  id: number;
  start_time: string; // ISO date
  end_time: string | null;
  name: string;
}

export interface OsuMatchEvent {
  id: number;
  detail: unknown;
  timestamp: string; // ISO date
  user_id: number | null;
}

export interface OsuCountry {
  code: string;
  name: string;
}

export interface OsuUser {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;

  default_group: string;
  is_active: boolean;
  is_bot: boolean;
  is_deleted: boolean;
  is_online: boolean;
  is_supporter: boolean;

  last_visit: string | null;
  pm_friends_only: boolean;
  profile_colour: string | null;

  country: OsuCountry;
}

export interface OsuMatchResponse {
  match: OsuMatch;
  events: OsuMatchEvent[];
  users: OsuUser[];
  first_event_id: number;
  latest_event_id: number;
  current_game_id: number | null;
}
