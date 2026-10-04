import api from "./axios";
import { ADMIN_API_PREFIX } from "./config";

export type SzfbSyncStatus = "idle" | "running" | "success" | "error";

export type AdminSzfbTeamBrand = {
  id: number;
  display_name: string;
  match_key: string;
  normalized_match_key: string;
  logo_url: string | null;
  shadow_color: string | null;
  use_shadow_color: boolean;
  is_active: boolean;
};

export type AdminSzfbStandingZone = {
  id: number;
  kind: "playoff" | "barage" | "relegation";
  label: string;
  start_position: number;
  end_position: number;
  display_order: number;
  is_active: boolean;
};

export type AdminSzfbStandingZoneInput = Omit<AdminSzfbStandingZone, "id">;

export type AdminSzfbStandingRow = {
  id: number;
  position: number;
  team_name: string;
  team_brand: AdminSzfbTeamBrand | null;
  played: number;
  goals_for: number | null;
  goals_against: number | null;
  score: string | null;
  points: number;
};

export type SzfbDecisionType =
  | "regulation"
  | "overtime"
  | "shootout"
  | "unknown"
  | "";

export type AdminSzfbMatch = {
  id: number;
  match_type: "finished" | "upcoming";
  match_date: string | null;
  match_time: string | null;
  opponent: string;
  opponent_brand: AdminSzfbTeamBrand | null;
  venue: string;
  result: string;
  decision_type: SzfbDecisionType;
  is_home: boolean | null;
};

export type AdminSzfbPlayerStat = {
  id: number;
  club_player_id: number | null;
  szfb_player_id: number | null;
  rank: number;
  player_name: string;
  birth_year: number | null;
  team_short_name: string;
  player_position: string;
  games: number;
  goals: number;
  assists: number;
  points: number;
  points_avg: string;
  esp: number;
  ppp: number;
  shp: number;
  pim: number;
  photo_url: string | null;
  jersey_number: number | null;
  display_position: string;
  height_cm: number | null;
  weight_kg: number | null;
  bio: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
};

export type AdminSzfbGoalieStat = {
  id: number;
  club_player_id: number | null;
  szfb_player_id: number;
  rank: number;
  jersey_number: number | null;
  player_name: string;
  birth_year: number | null;
  games: number;
  wins: number;
  overtime_wins: number;
  losses: number;
  overtime_losses: number;
  shots_against: number;
  goals_against: number;
  goals_against_average: string;
  saves: number;
  save_percentage: string;
  minutes_played_seconds: number;
  shutouts: number;
  photo_url: string | null;
  display_position: string;
  height_cm: number | null;
  weight_kg: number | null;
  bio: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
};

export type AdminSzfbTeamWatch = {
  id: number;
  label: string;
  team_name: string;
  competitor_id: number | null;
  is_active: boolean;
  club_id: number | null;
  club_name: string;
  club_slug: string;
  matches_count: number;
  finished_matches_count: number;
  upcoming_matches_count: number;
  player_stats_count: number;
  goalie_stats_count: number;
};

export type AdminSzfbCompetition = {
  id: number;
  szfb_competition_id: number;
  name: string;
  season: string;
  source_url: string;
  standings_url: string;
  results_url: string;
  last_synced_at: string | null;
  sync_status: SzfbSyncStatus;
  sync_started_at: string | null;
  sync_finished_at: string | null;
  sync_last_attempt_at: string | null;
  sync_error: string;
  standings_count: number;
  watched_teams_count: number;
  watched_teams: AdminSzfbTeamWatch[];
};


export type SzfbAutoSyncFrequency = "weekly";
export type SzfbAutoSyncStatus = "idle" | "success" | "error" | "skipped";

export type AdminSzfbWatchAutoSyncConfig = {
  id: number;
  watch_id: number;
  watch_label: string;
  watch_is_active: boolean;
  club_slug: string;
  club_name: string;
  is_enabled: boolean;
  frequency: SzfbAutoSyncFrequency;
  weekday: number;
  run_time: string;
  last_run_at: string | null;
  next_run_at: string | null;
  next_run_at_preview: string | null;
  last_status: SzfbAutoSyncStatus;
  last_message: string;
};

export type AdminSzfbWatchAutoSyncConfigPayload = {
  club_slug: string;
  is_enabled: boolean;
  frequency: SzfbAutoSyncFrequency;
  weekday: number;
  run_time: string;
};

export type StartSzfbSyncResponse = {
  status: "started" | "blocked";
  competition_id?: number;
  reason?: string;
  next_allowed_at?: string | null;
};

export type AdminSzfbPlayerUpdatePayload = {
  club_slug?: string;
  photo?: File | null;
  clear_photo?: boolean;
  jersey_number?: number | null;
  player_position?: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  bio?: string;
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
};

export type AdminSzfbTeamBrandPayload = {
  club_slug: string;
  display_name?: string;
  match_key?: string;
  logo?: File | null;
  clear_logo?: boolean;
  shadow_color?: string | null;
  use_shadow_color?: boolean;
  is_active?: boolean;
};

export type AdminSzfbWatchSettingsPayload = {
  club_slug: string;
  szfb_competition_id: number;
  competition_name: string;
  competition_season: string;
  competition_source_url: string;
  standings_url: string;
  results_url: string;
  label: string;
  team_name: string;
  competitor_id: number | null;
  is_active: boolean;
};

export async function getAdminSzfbCompetitions(
  clubSlug?: string,
  season?: string
) {
  const response = await api.get<AdminSzfbCompetition[]>(
    `${ADMIN_API_PREFIX}/szfb/competitions/`,
    {
      params: {
        ...(clubSlug ? { club: clubSlug } : {}),
        ...(season ? { season } : {}),
      },
    }
  );

  return response.data;
}


export async function getAdminSzfbWatchAutoSyncConfig(
  watchId: number,
  clubSlug: string
) {
  const response = await api.get<AdminSzfbWatchAutoSyncConfig>(
    `${ADMIN_API_PREFIX}/szfb/watches/${watchId}/auto-sync/`,
    {
      params: { club: clubSlug },
    }
  );

  return response.data;
}

export async function updateAdminSzfbWatchAutoSyncConfig(
  watchId: number,
  payload: AdminSzfbWatchAutoSyncConfigPayload
) {
  const response = await api.patch<AdminSzfbWatchAutoSyncConfig>(
    `${ADMIN_API_PREFIX}/szfb/watches/${watchId}/auto-sync/`,
    payload
  );

  return response.data;
}

export async function deleteAdminSzfbWatch(watchId: number, clubSlug: string) {
  await api.delete(`${ADMIN_API_PREFIX}/szfb/watches/${watchId}/`, {
    params: { club: clubSlug },
  });
}

export async function startAdminSzfbCompetitionSync(competitionId: number) {
  const response = await api.post<StartSzfbSyncResponse>(
    `${ADMIN_API_PREFIX}/szfb/competitions/${competitionId}/sync/`
  );

  return response.data;
}

export async function getAdminSzfbCompetitionStandings(
  competitionId: number,
  clubSlug?: string
) {
  const response = await api.get<AdminSzfbStandingRow[]>(
    `${ADMIN_API_PREFIX}/szfb/competitions/${competitionId}/standings/`,
    {
      params: clubSlug ? { club: clubSlug } : undefined,
    }
  );

  return response.data;
}

export async function getAdminSzfbCompetitionStandingZones(
  competitionId: number,
  clubSlug: string
) {
  const response = await api.get<AdminSzfbStandingZone[]>(
    `${ADMIN_API_PREFIX}/szfb/competitions/${competitionId}/standing-zones/`,
    { params: { club: clubSlug } }
  );

  return response.data;
}

export async function updateAdminSzfbCompetitionStandingZones(
  competitionId: number,
  clubSlug: string,
  zones: AdminSzfbStandingZoneInput[]
) {
  const response = await api.put<AdminSzfbStandingZone[]>(
    `${ADMIN_API_PREFIX}/szfb/competitions/${competitionId}/standing-zones/`,
    {
      club_slug: clubSlug,
      zones,
    }
  );

  return response.data;
}

function buildTeamBrandFormData(payload: AdminSzfbTeamBrandPayload) {
  const formData = new FormData();

  formData.append("club_slug", payload.club_slug);

  if (payload.display_name !== undefined) {
    formData.append("display_name", payload.display_name);
  }

  if (payload.match_key !== undefined) {
    formData.append("match_key", payload.match_key);
  }

  if (payload.logo) {
    formData.append("logo", payload.logo);
  }

  if (payload.clear_logo !== undefined) {
    formData.append("clear_logo", String(payload.clear_logo));
  }

  if (payload.shadow_color !== undefined) {
    formData.append("shadow_color", payload.shadow_color ?? "");
  }

  if (payload.use_shadow_color !== undefined) {
    formData.append("use_shadow_color", String(payload.use_shadow_color));
  }

  if (payload.is_active !== undefined) {
    formData.append("is_active", String(payload.is_active));
  }

  return formData;
}

export async function getAdminSzfbTeamBrands(clubSlug: string) {
  const response = await api.get<AdminSzfbTeamBrand[]>(
    `${ADMIN_API_PREFIX}/szfb/team-brands/`,
    { params: { club: clubSlug } }
  );

  return response.data;
}

export async function createAdminSzfbTeamBrand(
  payload: AdminSzfbTeamBrandPayload
) {
  const response = await api.post<AdminSzfbTeamBrand>(
    `${ADMIN_API_PREFIX}/szfb/team-brands/`,
    buildTeamBrandFormData(payload)
  );

  return response.data;
}

export async function updateAdminSzfbTeamBrand(
  brandId: number,
  payload: AdminSzfbTeamBrandPayload
) {
  const response = await api.patch<AdminSzfbTeamBrand>(
    `${ADMIN_API_PREFIX}/szfb/team-brands/${brandId}/`,
    buildTeamBrandFormData(payload)
  );

  return response.data;
}

export async function deleteAdminSzfbTeamBrand(
  brandId: number,
  clubSlug: string
) {
  await api.delete(`${ADMIN_API_PREFIX}/szfb/team-brands/${brandId}/`, {
    params: { club: clubSlug },
  });
}

export async function getAdminSzfbWatchMatches(
  watchId: number,
  matchType?: "finished" | "upcoming",
  clubSlug?: string
) {
  const response = await api.get<AdminSzfbMatch[]>(
    `${ADMIN_API_PREFIX}/szfb/watches/${watchId}/matches/`,
    {
      params: {
        ...(matchType ? { type: matchType } : {}),
        ...(clubSlug ? { club: clubSlug } : {}),
      },
    }
  );

  return response.data;
}

export async function getAdminSzfbWatchPlayers(
  watchId: number,
  clubSlug?: string,
  page = 1,
  pageSize = 10
) {
  const response = await api.get<PaginatedResponse<AdminSzfbPlayerStat>>(
    `${ADMIN_API_PREFIX}/szfb/watches/${watchId}/players/`,
    {
      params: {
        page,
        page_size: pageSize,
        ...(clubSlug ? { club: clubSlug } : {}),
      },
    }
  );

  return response.data;
}

export async function getAdminSzfbWatchGoalies(
  watchId: number,
  clubSlug?: string,
  page = 1,
  pageSize = 10
) {
  const response = await api.get<PaginatedResponse<AdminSzfbGoalieStat>>(
    `${ADMIN_API_PREFIX}/szfb/watches/${watchId}/goalies/`,
    {
      params: {
        page,
        page_size: pageSize,
        ...(clubSlug ? { club: clubSlug } : {}),
      },
    }
  );

  return response.data;
}

export async function updateAdminSzfbPlayerStat(
  playerId: number,
  payload: AdminSzfbPlayerUpdatePayload
) {
  const formData = new FormData();

  if (payload.photo) {
    formData.append("photo", payload.photo);
  }

  if (payload.club_slug !== undefined) {
    formData.append("club_slug", payload.club_slug);
  }

  if (payload.clear_photo !== undefined) {
    formData.append("clear_photo", String(payload.clear_photo));
  }

  if (payload.jersey_number !== undefined && payload.jersey_number !== null) {
    formData.append("jersey_number", String(payload.jersey_number));
  }

  if (payload.jersey_number === null) {
    formData.append("jersey_number", "");
  }

  if (payload.player_position !== undefined) {
    formData.append("player_position", payload.player_position);
  }

  if (payload.height_cm !== undefined && payload.height_cm !== null) {
    formData.append("height_cm", String(payload.height_cm));
  }

  if (payload.height_cm === null) {
    formData.append("height_cm", "");
  }

  if (payload.weight_kg !== undefined && payload.weight_kg !== null) {
    formData.append("weight_kg", String(payload.weight_kg));
  }

  if (payload.weight_kg === null) {
    formData.append("weight_kg", "");
  }

  if (payload.bio !== undefined) {
    formData.append("bio", payload.bio);
  }

  if (payload.is_active !== undefined) {
    formData.append("is_active", String(payload.is_active));
  }

  if (payload.is_featured !== undefined) {
    formData.append("is_featured", String(payload.is_featured));
  }

  if (payload.display_order !== undefined) {
    formData.append("display_order", String(payload.display_order));
  }

  const response = await api.patch<AdminSzfbPlayerStat>(
    `${ADMIN_API_PREFIX}/szfb/players/${playerId}/`,
    formData
  );

  return response.data;
}

export async function createAdminSzfbWatchSettings(
  payload: AdminSzfbWatchSettingsPayload
) {
  const response = await api.post(
    `${ADMIN_API_PREFIX}/szfb/settings/`,
    payload
  );

  return response.data;
}

export async function updateAdminSzfbWatchSettings(
  watchId: number,
  payload: AdminSzfbWatchSettingsPayload
) {
  const response = await api.patch(
    `${ADMIN_API_PREFIX}/szfb/watches/${watchId}/settings/`,
    payload
  );

  return response.data;
}

export type AdminClubPlayerCategory = {
  watch_id: number;
  label: string;
  team_name: string;
  competition_id: number | null;
  competition_name: string;
  season: string;
};

export type AdminClubPlayer = {
  id: number;
  full_name: string;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  photo_url: string | null;
  jersey_number: number | null;
  position: string;
  bio: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  categories: AdminClubPlayerCategory[];
};

export type AdminClubPlayersQueryParams = {
  clubSlug: string;
  watchId?: number | string;
  season?: string;
  search?: string;
  active?: "all" | "true" | "false";
  page?: number;
  pageSize?: number;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type AdminClubPlayerUpdatePayload = {
  club_slug?: string;
  photo?: File | null;
  clear_photo?: boolean;
  full_name?: string;
  birth_year?: number | null;
  jersey_number?: number | null;
  position?: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  bio?: string;
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
};

function appendOptionalNumber(
  formData: FormData,
  key: string,
  value: number | null | undefined
) {
  if (value === undefined) {
    return;
  }

  if (value === null) {
    formData.append(key, "");
    return;
  }

  formData.append(key, String(value));
}

export async function getAdminClubPlayers(params: AdminClubPlayersQueryParams) {
  const response = await api.get<PaginatedResponse<AdminClubPlayer>>(
    `${ADMIN_API_PREFIX}/szfb/club-players/`,
    {
      params: {
        club: params.clubSlug,
        page: params.page ?? 1,
        page_size: params.pageSize ?? 10,
        ...(params.watchId ? { watch: params.watchId } : {}),
        ...(params.season ? { season: params.season } : {}),
        ...(params.search ? { search: params.search } : {}),
        ...(params.active && params.active !== "all"
          ? { active: params.active }
          : {}),
      },
    }
  );

  return response.data;
}

export async function updateAdminClubPlayer(
  playerId: number,
  payload: AdminClubPlayerUpdatePayload
) {
  const formData = new FormData();

  if (payload.club_slug !== undefined) {
    formData.append("club_slug", payload.club_slug);
  }

  if (payload.photo) {
    formData.append("photo", payload.photo);
  }

  if (payload.clear_photo !== undefined) {
    formData.append("clear_photo", String(payload.clear_photo));
  }

  if (payload.full_name !== undefined) {
    formData.append("full_name", payload.full_name);
  }

  appendOptionalNumber(formData, "birth_year", payload.birth_year);
  appendOptionalNumber(formData, "jersey_number", payload.jersey_number);
  appendOptionalNumber(formData, "height_cm", payload.height_cm);
  appendOptionalNumber(formData, "weight_kg", payload.weight_kg);
  appendOptionalNumber(formData, "display_order", payload.display_order);

  if (payload.position !== undefined) {
    formData.append("position", payload.position);
  }

  if (payload.bio !== undefined) {
    formData.append("bio", payload.bio);
  }

  if (payload.is_active !== undefined) {
    formData.append("is_active", String(payload.is_active));
  }

  if (payload.is_featured !== undefined) {
    formData.append("is_featured", String(payload.is_featured));
  }

  const response = await api.patch<AdminClubPlayer>(
    `${ADMIN_API_PREFIX}/szfb/club-players/${playerId}/`,
    formData
  );

  return response.data;
}
export async function deleteAdminClubPlayer(
  playerId: number,
  clubSlug?: string
) {
  await api.delete(
    `${ADMIN_API_PREFIX}/szfb/club-players/${playerId}/`,
    {
      params: clubSlug ? { club: clubSlug } : undefined,
    }
  );
}
