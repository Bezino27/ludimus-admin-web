import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminSzfbWatchSettings,
  getAdminSzfbAutoSyncConfig,
  getAdminSzfbCompetitions,
  getAdminSzfbCompetitionStandings,
  getAdminSzfbWatchMatches,
  getAdminSzfbWatchPlayers,
  startAdminSzfbCompetitionSync,
  updateAdminSzfbAutoSyncConfig,
  updateAdminSzfbPlayerStat,
  updateAdminSzfbWatchSettings,
  type AdminSzfbAutoSyncConfig,
  type AdminSzfbCompetition,
  type AdminSzfbMatch,
  type AdminSzfbPlayerStat,
  type AdminSzfbStandingRow,
  type AdminSzfbTeamWatch,
  type AdminSzfbWatchSettingsPayload,
  type SzfbSyncStatus,
} from "../../api/szfb";
import { useAuth } from "../../context/useAuth";
import styles from "./SportsDataPage.module.css";

type PanelType = "league" | "team" | "players";

type PlayerFormState = {
  playerId: number;
  clubPlayerId: number | null;
  playerName: string;
  jerseyNumber: string;
  playerPosition: string;
  heightCm: string;
  weightKg: string;
  bio: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: string;
  clearPhoto: boolean;
  photoFile: File | null;
  photoUrl: string | null;
};

type SettingsFormState = {
  mode: "create" | "edit";
  watchId: number | null;
  szfbCompetitionId: string;
  competitionName: string;
  competitionSeason: string;
  competitionSourceUrl: string;
  standingsUrl: string;
  resultsUrl: string;
  label: string;
  teamName: string;
  competitorId: string;
  isActive: boolean;
};

type PlayerStatsPageState = {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
};

type AutoSyncFormState = {
  isEnabled: boolean;
  weekday: string;
  runTime: string;
};

const PLAYER_STATS_PAGE_SIZE = 10;

const WEEKDAY_OPTIONS = [
  { value: "0", label: "Pondelok" },
  { value: "1", label: "Utorok" },
  { value: "2", label: "Streda" },
  { value: "3", label: "Štvrtok" },
  { value: "4", label: "Piatok" },
  { value: "5", label: "Sobota" },
  { value: "6", label: "Nedeľa" },
];

const emptySettingsForm: SettingsFormState = {
  mode: "create",
  watchId: null,
  szfbCompetitionId: "",
  competitionName: "",
  competitionSeason: "",
  competitionSourceUrl: "",
  standingsUrl: "",
  resultsUrl: "",
  label: "",
  teamName: "",
  competitorId: "",
  isActive: true,
};

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAutoSyncStatusLabel(status: AdminSzfbAutoSyncConfig["last_status"]) {
  if (status === "success") return "Hotovo";
  if (status === "error") return "Chyba";
  if (status === "skipped") return "Preskočené";

  return "Neaktívne";
}

function formatMatchDateTime(match: AdminSzfbMatch) {
  if (!match.match_date && !match.match_time) return "—";

  const date = match.match_date
    ? new Intl.DateTimeFormat("sk-SK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(match.match_date))
    : "—";

  const time = match.match_time ? match.match_time.slice(0, 5) : "";

  return `${date}${time ? ` ${time}` : ""}`;
}

function getStatusLabel(status: SzfbSyncStatus) {
  if (status === "running") return "Prebieha";
  if (status === "success") return "Hotovo";
  if (status === "error") return "Chyba";

  return "Neaktívne";
}

function getPanelKey(competitionId: number, type: PanelType) {
  return `${competitionId}:${type}`;
}

function getStatusClass(status: SzfbSyncStatus) {
  if (status === "running") return styles.status_running;
  if (status === "success") return styles.status_success;
  if (status === "error") return styles.status_error;

  return styles.status_idle;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  return Number(trimmed);
}

export default function SportsDataPage() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<AdminSzfbCompetition[]>([]);
  const [autoSyncConfig, setAutoSyncConfig] =
    useState<AdminSzfbAutoSyncConfig | null>(null);
  const [autoSyncForm, setAutoSyncForm] = useState<AutoSyncFormState>({
    isEnabled: false,
    weekday: "0",
    runTime: "06:00",
  });
  const [isAutoSyncLoading, setIsAutoSyncLoading] = useState(false);
  const [isAutoSyncSaving, setIsAutoSyncSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [syncingCompetitionId, setSyncingCompetitionId] = useState<number | null>(
    null
  );
  const [standingsByCompetition, setStandingsByCompetition] = useState<
    Record<number, AdminSzfbStandingRow[]>
  >({});
  const [matchesByWatch, setMatchesByWatch] = useState<
    Record<number, AdminSzfbMatch[]>
  >({});
  const [playersByWatch, setPlayersByWatch] = useState<
    Record<number, AdminSzfbPlayerStat[]>
  >({});
  const [playerPagesByWatch, setPlayerPagesByWatch] = useState<
    Record<number, PlayerStatsPageState>
  >({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  const [playerForm, setPlayerForm] = useState<PlayerFormState | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState | null>(
    null
  );
  const [isSavingModal, setIsSavingModal] = useState(false);

  const activeClub =
    user?.memberships?.find((membership) => membership.is_active) ??
    user?.memberships?.[0];
  const activeClubSlug = activeClub?.club_slug || "";

  const hasRunningSync = useMemo(
    () =>
      competitions.some((competition) => competition.sync_status === "running"),
    [competitions]
  );

  const seasonOptions = useMemo(() => {
    return Array.from(
      new Set(
        competitions
          .map((competition) => competition.season)
          .filter(Boolean)
      )
    ).sort((a, b) => b.localeCompare(a));
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    if (!seasonFilter) return competitions;

    return competitions.filter(
      (competition) => competition.season === seasonFilter
    );
  }, [competitions, seasonFilter]);

  const loadCompetitions = useCallback(async () => {
    if (!activeClubSlug) {
      setActionMessage("Nepodarilo sa určiť aktívny klub.");
      setCompetitions([]);
      return;
    }

    const data = await getAdminSzfbCompetitions(activeClubSlug);
    setCompetitions(data);
  }, [activeClubSlug]);

  const applyAutoSyncConfig = (config: AdminSzfbAutoSyncConfig) => {
    setAutoSyncConfig(config);
    setAutoSyncForm({
      isEnabled: config.is_enabled,
      weekday: String(config.weekday),
      runTime: config.run_time?.slice(0, 5) || "06:00",
    });
  };

  const loadAutoSyncConfig = useCallback(async () => {
    if (!activeClubSlug) {
      setAutoSyncConfig(null);
      return;
    }

    setIsAutoSyncLoading(true);

    try {
      const config = await getAdminSzfbAutoSyncConfig(activeClubSlug);
      applyAutoSyncConfig(config);
    } catch (error) {
      console.error("Nepodarilo sa načítať SZFB automatiku:", error);
      setActionMessage("Nastavenie automatickej synchronizácie sa nepodarilo načítať.");
    } finally {
      setIsAutoSyncLoading(false);
    }
  }, [activeClubSlug]);

  const setPanelLoading = (key: string, isLoadingPanel: boolean) => {
    setDetailLoading((current) => ({
      ...current,
      [key]: isLoadingPanel,
    }));
  };

  const setPanelError = (key: string, message: string) => {
    setDetailErrors((current) => ({
      ...current,
      [key]: message,
    }));
  };

  const clearCompetitionDetailCache = useCallback(
    (competition: AdminSzfbCompetition) => {
      setStandingsByCompetition((current) => {
        const next = { ...current };
        delete next[competition.id];
        return next;
      });

      setMatchesByWatch((current) => {
        const next = { ...current };
        competition.watched_teams.forEach((team) => {
          delete next[team.id];
        });
        return next;
      });

      setPlayersByWatch((current) => {
        const next = { ...current };
        competition.watched_teams.forEach((team) => {
          delete next[team.id];
        });
        return next;
      });

      setPlayerPagesByWatch((current) => {
        const next = { ...current };
        competition.watched_teams.forEach((team) => {
          delete next[team.id];
        });
        return next;
      });
    },
    []
  );

  const ensureLeagueTable = useCallback(
    async (competitionId: number) => {
      const key = getPanelKey(competitionId, "league");

      if (standingsByCompetition[competitionId]) return;

      setPanelLoading(key, true);
      setPanelError(key, "");

      try {
        const standings = await getAdminSzfbCompetitionStandings(
          competitionId,
          activeClubSlug
        );

        setStandingsByCompetition((current) => ({
          ...current,
          [competitionId]: standings,
        }));
      } catch (error) {
        console.error("Nepodarilo sa načítať tabuľku SZFB:", error);
        setPanelError(key, "Tabuľku sa nepodarilo načítať.");
      } finally {
        setPanelLoading(key, false);
      }
    },
    [activeClubSlug, standingsByCompetition]
  );

  const ensureTeamMatches = useCallback(
    async (competition: AdminSzfbCompetition) => {
      const key = getPanelKey(competition.id, "team");
      const missingTeams = competition.watched_teams.filter(
        (team) => !matchesByWatch[team.id]
      );

      if (missingTeams.length === 0) return;

      setPanelLoading(key, true);
      setPanelError(key, "");

      try {
        const entries = await Promise.all(
          missingTeams.map(async (team) => {
            const matches = await getAdminSzfbWatchMatches(
              team.id,
              undefined,
              activeClubSlug
            );
            return [team.id, matches] as const;
          })
        );

        setMatchesByWatch((current) => {
          const next = { ...current };
          entries.forEach(([teamId, matches]) => {
            next[teamId] = matches;
          });
          return next;
        });
      } catch (error) {
        console.error("Nepodarilo sa načítať zápasy SZFB:", error);
        setPanelError(key, "Zápasy sa nepodarilo načítať.");
      } finally {
        setPanelLoading(key, false);
      }
    },
    [activeClubSlug, matchesByWatch]
  );

  const ensurePlayerStats = useCallback(
    async (competition: AdminSzfbCompetition) => {
      const key = getPanelKey(competition.id, "players");
      const missingTeams = competition.watched_teams.filter(
        (team) => !playersByWatch[team.id]
      );

      if (missingTeams.length === 0) return;

      setPanelLoading(key, true);
      setPanelError(key, "");

      try {
        const entries = await Promise.all(
          missingTeams.map(async (team) => {
            const data = await getAdminSzfbWatchPlayers(
              team.id,
              activeClubSlug,
              1,
              PLAYER_STATS_PAGE_SIZE
            );
            return [team.id, data] as const;
          })
        );

        setPlayersByWatch((current) => {
          const next = { ...current };
          entries.forEach(([teamId, data]) => {
            next[teamId] = data.results;
          });
          return next;
        });

        setPlayerPagesByWatch((current) => {
          const next = { ...current };
          entries.forEach(([teamId, data]) => {
            next[teamId] = {
              count: data.count,
              next: data.next,
              previous: data.previous,
              page: 1,
            };
          });
          return next;
        });
      } catch (error) {
        console.error("Nepodarilo sa načítať hráčov SZFB:", error);
        setPanelError(key, "Hráčske štatistiky sa nepodarilo načítať.");
      } finally {
        setPanelLoading(key, false);
      }
    },
    [activeClubSlug, playersByWatch]
  );

  const loadMorePlayerStats = async (team: AdminSzfbTeamWatch) => {
    const pageState = playerPagesByWatch[team.id];

    if (!pageState?.next || detailLoading[`players:${team.id}:more`]) {
      return;
    }

    const loadingKey = `players:${team.id}:more`;
    setPanelLoading(loadingKey, true);
    setPanelError(loadingKey, "");

    try {
      const nextPage = pageState.page + 1;
      const data = await getAdminSzfbWatchPlayers(
        team.id,
        activeClubSlug,
        nextPage,
        PLAYER_STATS_PAGE_SIZE
      );

      setPlayersByWatch((current) => ({
        ...current,
        [team.id]: [...(current[team.id] || []), ...data.results],
      }));

      setPlayerPagesByWatch((current) => ({
        ...current,
        [team.id]: {
          count: data.count,
          next: data.next,
          previous: data.previous,
          page: nextPage,
        },
      }));
    } catch (error) {
      console.error("Nepodarilo sa načítať ďalších hráčov SZFB:", error);
      setPanelError(loadingKey, "Ďalších hráčov sa nepodarilo načítať.");
    } finally {
      setPanelLoading(loadingKey, false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);

      try {
        if (!activeClubSlug) {
          setActionMessage("Nepodarilo sa určiť aktívny klub.");
          setCompetitions([]);
          return;
        }

        const [data, syncConfig] = await Promise.all([
          getAdminSzfbCompetitions(activeClubSlug),
          getAdminSzfbAutoSyncConfig(activeClubSlug),
        ]);

        if (isMounted) {
          setCompetitions(data);
          applyAutoSyncConfig(syncConfig);
        }
      } catch (error) {
        console.error("Nepodarilo sa načítať SZFB dáta:", error);

        if (isMounted) {
          setActionMessage("SZFB dáta sa nepodarilo načítať.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [activeClubSlug]);

  useEffect(() => {
    if (!hasRunningSync) return;

    const intervalId = window.setInterval(() => {
      void loadCompetitions();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasRunningSync, loadCompetitions]);

  const handleAutoSyncSave = async () => {
    if (!activeClubSlug || isAutoSyncSaving) {
      return;
    }

    setIsAutoSyncSaving(true);
    setActionMessage("");

    try {
      const config = await updateAdminSzfbAutoSyncConfig({
        club_slug: activeClubSlug,
        is_enabled: autoSyncForm.isEnabled,
        frequency: "weekly",
        weekday: Number(autoSyncForm.weekday),
        run_time: autoSyncForm.runTime,
      });

      applyAutoSyncConfig(config);
      setActionMessage("Automatická synchronizácia bola uložená.");
    } catch (error) {
      console.error("Nepodarilo sa uložiť SZFB automatiku:", error);
      setActionMessage("Automatickú synchronizáciu sa nepodarilo uložiť.");
    } finally {
      setIsAutoSyncSaving(false);
    }
  };

  const handleSync = async (competitionId: number) => {
    setSyncingCompetitionId(competitionId);
    setActionMessage("Spúšťam synchronizáciu...");

    try {
      await startAdminSzfbCompetitionSync(competitionId);
      const competition = competitions.find((item) => item.id === competitionId);

      if (competition) {
        clearCompetitionDetailCache(competition);
      }

      setActionMessage("Synchronizácia bola spustená.");
      await loadCompetitions();
    } catch (error: unknown) {
      console.error("Nepodarilo sa spustiť SZFB sync:", error);

      let reason: string | undefined;

      if (axios.isAxiosError<{ reason?: string }>(error)) {
        reason = error.response?.data?.reason;
      }

      if (reason === "rate_limited") {
        setActionMessage("Táto súťaž bola synchronizovaná príliš nedávno.");
      } else if (reason === "already_running") {
        setActionMessage("Synchronizácia tejto súťaže už prebieha.");
      } else if (reason === "missing_source_url") {
        setActionMessage("Súťaž nemá vyplnenú source URL.");
      } else {
        setActionMessage("Synchronizáciu sa nepodarilo spustiť.");
      }

      await loadCompetitions();
    } finally {
      setSyncingCompetitionId(null);
    }
  };

  const togglePanel = (competition: AdminSzfbCompetition, type: PanelType) => {
    const key = getPanelKey(competition.id, type);

    setActivePanel((current) => {
      if (current === key) {
        return null;
      }

      if (type === "league") {
        void ensureLeagueTable(competition.id);
      } else if (type === "team") {
        void ensureTeamMatches(competition);
      } else {
        void ensurePlayerStats(competition);
      }

      return key;
    });
  };

  const openPlayerModal = (player: AdminSzfbPlayerStat) => {
    setPlayerForm({
      playerId: player.id,
      clubPlayerId: player.club_player_id,
      playerName: player.player_name,
      jerseyNumber:
        player.jersey_number === null || player.jersey_number === undefined
          ? ""
          : String(player.jersey_number),
      playerPosition: player.display_position || player.player_position || "",
      heightCm:
        player.height_cm === null || player.height_cm === undefined
          ? ""
          : String(player.height_cm),
      weightKg:
        player.weight_kg === null || player.weight_kg === undefined
          ? ""
          : String(player.weight_kg),
      bio: player.bio || "",
      isActive: player.is_active,
      isFeatured: player.is_featured,
      displayOrder: String(player.display_order || 0),
      clearPhoto: false,
      photoFile: null,
      photoUrl: player.photo_url,
    });
  };

  const openSettingsCreateModal = () => {
    setSettingsForm({
      ...emptySettingsForm,
      competitionSeason: seasonFilter,
    });
  };

  const openSettingsEditModal = (
    competition: AdminSzfbCompetition,
    team: AdminSzfbTeamWatch
  ) => {
    setSettingsForm({
      mode: "edit",
      watchId: team.id,
      szfbCompetitionId: String(competition.szfb_competition_id),
      competitionName: competition.name,
      competitionSeason: competition.season,
      competitionSourceUrl: competition.source_url,
      standingsUrl: competition.standings_url,
      resultsUrl: competition.results_url,
      label: team.label,
      teamName: team.team_name,
      competitorId:
        team.competitor_id === null || team.competitor_id === undefined
          ? ""
          : String(team.competitor_id),
      isActive: team.is_active,
    });
  };

  const handlePlayerSave = async () => {
    if (!playerForm || isSavingModal) return;

    if (!activeClubSlug) {
      setActionMessage("Nepodarilo sa určiť aktívny klub.");
      return;
    }

    setIsSavingModal(true);
    setActionMessage("");

    try {
      const updatedPlayer = await updateAdminSzfbPlayerStat(playerForm.playerId, {
        club_slug: activeClubSlug,
        photo: playerForm.photoFile,
        clear_photo: playerForm.clearPhoto,
        jersey_number: toOptionalNumber(playerForm.jerseyNumber),
        player_position: playerForm.playerPosition,
        bio: playerForm.bio,
        is_active: playerForm.isActive,
        is_featured: playerForm.isFeatured,
        display_order: toOptionalNumber(playerForm.displayOrder) || 0,
      });

      setActionMessage("Hráč bol upravený.");
      setPlayersByWatch((current) => {
        const next = { ...current };

        Object.entries(next).forEach(([teamId, players]) => {
          next[Number(teamId)] = players.map((player) => {
            const isSameStat = player.id === playerForm.playerId;
            const isSameClubPlayer =
              updatedPlayer.club_player_id !== null &&
              player.club_player_id === updatedPlayer.club_player_id;

            if (!isSameStat && !isSameClubPlayer) {
              return player;
            }

            return {
              ...player,
              club_player_id: updatedPlayer.club_player_id,
              player_name: updatedPlayer.player_name,
              photo_url: updatedPlayer.photo_url,
              jersey_number: updatedPlayer.jersey_number,
              player_position: updatedPlayer.player_position,
              display_position: updatedPlayer.display_position,
              height_cm: updatedPlayer.height_cm,
              weight_kg: updatedPlayer.weight_kg,
              bio: updatedPlayer.bio,
              is_active: updatedPlayer.is_active,
              is_featured: updatedPlayer.is_featured,
              display_order: updatedPlayer.display_order,
            };
          });
        });

        return next;
      });
      setPlayerForm(null);
      await loadCompetitions();
    } catch (error) {
      console.error("Nepodarilo sa uložiť hráča:", error);
      setActionMessage("Hráča sa nepodarilo uložiť.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!settingsForm) return;

    if (!activeClubSlug) {
      setActionMessage("Nepodarilo sa určiť aktívny klub.");
      return;
    }

    setIsSavingModal(true);
    setActionMessage("");

    const payload: AdminSzfbWatchSettingsPayload = {
      club_slug: activeClubSlug,
      szfb_competition_id: Number(settingsForm.szfbCompetitionId),
      competition_name: settingsForm.competitionName,
      competition_season: settingsForm.competitionSeason,
      competition_source_url: settingsForm.competitionSourceUrl,
      standings_url: settingsForm.standingsUrl,
      results_url: settingsForm.resultsUrl,
      label: settingsForm.label,
      team_name: settingsForm.teamName,
      competitor_id: toOptionalNumber(settingsForm.competitorId),
      is_active: settingsForm.isActive,
    };

    try {
      if (settingsForm.mode === "edit" && settingsForm.watchId) {
        await updateAdminSzfbWatchSettings(settingsForm.watchId, payload);
        setActionMessage("SZFB nastavenie bolo upravené.");
      } else {
        await createAdminSzfbWatchSettings(payload);
        setActionMessage("Nové SZFB sledovanie bolo vytvorené.");
      }

      setSettingsForm(null);
      setStandingsByCompetition({});
      setMatchesByWatch({});
      setPlayersByWatch({});
      setPlayerPagesByWatch({});
      await loadCompetitions();
    } catch (error) {
      console.error("Nepodarilo sa uložiť SZFB nastavenie:", error);
      setActionMessage("SZFB nastavenie sa nepodarilo uložiť.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const renderLeagueTable = (standings: AdminSzfbStandingRow[]) => {
    if (standings.length === 0) {
      return (
        <div className={styles.emptyPanel}>
          Táto súťaž zatiaľ nemá uloženú tabuľku.
        </div>
      );
    }

    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Tím</th>
              <th>Zápasy</th>
              <th>Body</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.id}>
                <td>{row.position}</td>
                <td>{row.team_name}</td>
                <td>{row.played}</td>
                <td>
                  <strong>{row.points}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTeamStats = (
    team: AdminSzfbTeamWatch,
    matches: AdminSzfbMatch[] | undefined
  ) => {
    if (!matches) {
      return (
        <div key={team.id} className={styles.emptyPanel}>
          Načítavam zápasy pre {team.label}...
        </div>
      );
    }

    if (matches.length === 0) {
      return (
        <div key={team.id} className={styles.emptyPanel}>
          {team.label} zatiaľ nemá uložené zápasy.
        </div>
      );
    }

    return (
      <div key={team.id} className={styles.teamStatsBlock}>
        <div className={styles.panelSubheader}>
          <div>
            <h4>{team.label}</h4>
            <p>{team.team_name}</p>
          </div>

          <span>{team.matches_count} zápasov</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Typ</th>
                <th>Dátum</th>
                <th>Súper</th>
                <th>Výsledok</th>
                <th>Miesto</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td>
                    {match.match_type === "upcoming" ? "Najbližší" : "Odohraný"}
                  </td>
                  <td>{formatMatchDateTime(match)}</td>
                  <td>{match.opponent}</td>
                  <td>{match.result || "—"}</td>
                  <td>{match.venue || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPlayerStats = (
    team: AdminSzfbTeamWatch,
    players: AdminSzfbPlayerStat[] | undefined,
    pageState: PlayerStatsPageState | undefined
  ) => {
    if (!players) {
      return (
        <div key={team.id} className={styles.emptyPanel}>
          Načítavam hráčov pre {team.label}...
        </div>
      );
    }

    if (players.length === 0) {
      return (
        <div key={team.id} className={styles.emptyPanel}>
          {team.label} zatiaľ nemá uložené hráčske štatistiky.
        </div>
      );
    }

    return (
      <div key={team.id} className={styles.teamStatsBlock}>
        <div className={styles.panelSubheader}>
          <div>
            <h4>{team.label}</h4>
            <p>{team.team_name}</p>
          </div>

          <span>
            {players.length} / {pageState?.count ?? team.player_stats_count} hráčov
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Hráč</th>
                <th>Číslo</th>
                <th>Post</th>
                <th>Rok</th>
                <th>Z</th>
                <th>G</th>
                <th>A</th>
                <th>B</th>
                <th>ESP</th>
                <th>PPP</th>
                <th>SHP</th>
                <th>PIM</th>
                <th>Foto</th>
                <th>Úprava</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>{player.rank}</td>
                  <td>{player.player_name}</td>
                  <td>{player.jersey_number || "—"}</td>
                  <td>{player.display_position || player.player_position || "—"}</td>
                  <td>{player.birth_year || "—"}</td>
                  <td>{player.games}</td>
                  <td>{player.goals}</td>
                  <td>{player.assists}</td>
                  <td>
                    <strong>{player.points}</strong>
                  </td>
                  <td>{player.esp}</td>
                  <td>{player.ppp}</td>
                  <td>{player.shp}</td>
                  <td>{player.pim}</td>
                  <td>{player.photo_url ? "Áno" : "Nie"}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.smallLinkButton}
                      onClick={() => openPlayerModal(player)}
                    >
                      Upraviť
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detailErrors[`players:${team.id}:more`] ? (
          <div className={styles.errorBox}>
            {detailErrors[`players:${team.id}:more`]}
          </div>
        ) : null}

        {pageState?.next ? (
          <div className={styles.panelFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void loadMorePlayerStats(team)}
              disabled={detailLoading[`players:${team.id}:more`]}
            >
              {detailLoading[`players:${team.id}:more`]
                ? "Načítavam..."
                : "Načítať ďalších"}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Športové dáta</p>
          <h1>SZFB synchronizácia</h1>
          <p className={styles.subtitle}>
            Aktualizuj a kontroluj ligové tabuľky, tímové zápasy a hráčske
            štatistiky zo SZFB.
          </p>
        </div>

        <div className={styles.headerActions}>
          <select
            className={styles.select}
            value={seasonFilter}
            onChange={(event) => setSeasonFilter(event.target.value)}
            aria-label="Filtrovať sezónu"
          >
            <option value="">Všetky sezóny</option>

            {seasonOptions.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              void loadCompetitions();
              void loadAutoSyncConfig();
            }}
          >
            Obnoviť
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={openSettingsCreateModal}
          >
            Nové sledovanie
          </button>
        </div>
      </header>

      <section className={styles.autoSyncCard}>
        <div className={styles.autoSyncTop}>
          <div>
            <p className={styles.eyebrow}>Automatika</p>
            <h2>Automatická SZFB synchronizácia</h2>
            <p>
              Backend raz za čas skontroluje nastavenie a pri týždennom termíne
              zosynchronizuje všetky aktívne SZFB súťaže aktuálneho klubu.
            </p>
          </div>

          <span
            className={`${styles.statusBadge} ${
              autoSyncConfig?.last_status === "error"
                ? styles.status_error
                : autoSyncConfig?.last_status === "success"
                  ? styles.status_success
                  : styles.status_idle
            }`}
          >
            {autoSyncConfig
              ? getAutoSyncStatusLabel(autoSyncConfig.last_status)
              : "Načítavam"}
          </span>
        </div>

        <div className={styles.autoSyncForm}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={autoSyncForm.isEnabled}
              onChange={(event) =>
                setAutoSyncForm((current) => ({
                  ...current,
                  isEnabled: event.target.checked,
                }))
              }
              disabled={isAutoSyncLoading}
            />
            Automatiku zapnúť
          </label>


          <label className={styles.field}>
            <span>Deň</span>
            <select
              className={styles.select}
              value={autoSyncForm.weekday}
              onChange={(event) =>
                setAutoSyncForm((current) => ({
                  ...current,
                  weekday: event.target.value,
                }))
              }
              disabled={isAutoSyncLoading}
            >
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Čas</span>
            <input
              type="time"
              value={autoSyncForm.runTime}
              onChange={(event) =>
                setAutoSyncForm((current) => ({
                  ...current,
                  runTime: event.target.value,
                }))
              }
              disabled={isAutoSyncLoading}
            />
          </label>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleAutoSyncSave()}
            disabled={isAutoSyncSaving || isAutoSyncLoading || !activeClubSlug}
          >
            {isAutoSyncSaving ? "Ukladám..." : "Uložiť automatiku"}
          </button>
        </div>

        <div className={styles.autoSyncMeta}>
          <div>
            <span>Posledný automatický sync</span>
            <strong>{formatDateTime(autoSyncConfig?.last_run_at || null)}</strong>
          </div>
          <div>
            <span>Najbližší sync</span>
            <strong>
              {formatDateTime(
                autoSyncConfig?.next_run_at_preview ||
                  autoSyncConfig?.next_run_at ||
                  null
              )}
            </strong>
          </div>
          <div>
            <span>Posledná správa</span>
            <strong>{autoSyncConfig?.last_message || "—"}</strong>
          </div>
        </div>
      </section>

      {actionMessage ? (
        <div className={styles.messageBox}>{actionMessage}</div>
      ) : null}

      {isLoading ? (
        <div className={styles.stateBox}>Načítavam SZFB dáta...</div>
      ) : null}

      {!isLoading && filteredCompetitions.length === 0 ? (
        <div className={styles.stateBox}>
          Pre vybranú sezónu nie sú vytvorené žiadne SZFB súťaže.
        </div>
      ) : null}

      <div className={styles.grid}>
        {filteredCompetitions.map((competition) => {
          const isRunning = competition.sync_status === "running";
          const isButtonDisabled =
            isRunning ||
            syncingCompetitionId === competition.id ||
            !competition.source_url;

          const leaguePanelKey = getPanelKey(competition.id, "league");
          const teamPanelKey = getPanelKey(competition.id, "team");
          const playersPanelKey = getPanelKey(competition.id, "players");
          const activeLeaguePanel = activePanel === leaguePanelKey;
          const activeTeamPanel = activePanel === teamPanelKey;
          const activePlayersPanel = activePanel === playersPanelKey;

          return (
            <article key={competition.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardEyebrow}>
                    SZFB competition ID: {competition.szfb_competition_id}
                  </p>
                  <h2>{competition.name || "Bez názvu súťaže"}</h2>
                </div>

                <span
                  className={`${styles.statusBadge} ${getStatusClass(
                    competition.sync_status
                  )}`}
                >
                  {getStatusLabel(competition.sync_status)}
                </span>
              </div>

              <div className={styles.infoGrid}>
                <div>
                  <span>Sezóna</span>
                  <strong>{competition.season || "—"}</strong>
                </div>

                <div>
                  <span>Posledný sync</span>
                  <strong>{formatDateTime(competition.last_synced_at)}</strong>
                </div>

                <div>
                  <span>Tabuľka</span>
                  <strong>{competition.standings_count} riadkov</strong>
                </div>

                <div>
                  <span>Sledované tímy</span>
                  <strong>{competition.watched_teams_count}</strong>
                </div>
              </div>

              <div className={styles.sourceBox}>
                <span>Source URL</span>
                <strong>{competition.source_url || "—"}</strong>
              </div>

              <div className={styles.teamsList}>
                {competition.watched_teams.map((team) => (
                  <div key={team.id} className={styles.teamMiniCard}>
                    <div>
                      <strong>{team.label}</strong>
                      <span>{team.team_name}</span>
                    </div>

                    <div className={styles.teamMiniStats}>
                      <span>Competitor ID: {team.competitor_id || "—"}</span>
                      <span>Zápasy: {team.matches_count}</span>
                      <span>Hráči: {team.player_stats_count}</span>
                    </div>

                    <div className={styles.teamMiniActions}>
                      <button
                        type="button"
                        className={styles.smallLinkButton}
                        onClick={() => openSettingsEditModal(competition, team)}
                      >
                        Upraviť SZFB
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {competition.sync_error ? (
                <div className={styles.errorBox}>{competition.sync_error}</div>
              ) : null}

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => handleSync(competition.id)}
                  disabled={isButtonDisabled}
                >
                  {isRunning ? "Prebieha..." : "Synchronizovať"}
                </button>

                <button
                  type="button"
                  className={`${styles.secondaryButton} ${
                    activeLeaguePanel ? styles.activeButton : ""
                  }`}
                  onClick={() => togglePanel(competition, "league")}
                >
                  Liga / tabuľka
                </button>

                <button
                  type="button"
                  className={`${styles.secondaryButton} ${
                    activeTeamPanel ? styles.activeButton : ""
                  }`}
                  onClick={() => togglePanel(competition, "team")}
                >
                  Štatistiky tímu
                </button>

                <button
                  type="button"
                  className={`${styles.secondaryButton} ${
                    activePlayersPanel ? styles.activeButton : ""
                  }`}
                  onClick={() => togglePanel(competition, "players")}
                >
                  Hráčske štatistiky
                </button>
              </div>

              {activeLeaguePanel ? (
                <section className={styles.detailPanel}>
                  <div className={styles.panelHeader}>
                    <h3>Liga / tabuľka</h3>
                    <span>{competition.standings_count} riadkov</span>
                  </div>

                  {detailLoading[leaguePanelKey] ? (
                    <div className={styles.emptyPanel}>Načítavam tabuľku...</div>
                  ) : detailErrors[leaguePanelKey] ? (
                    <div className={styles.errorBox}>
                      {detailErrors[leaguePanelKey]}
                    </div>
                  ) : (
                    renderLeagueTable(standingsByCompetition[competition.id] || [])
                  )}
                </section>
              ) : null}

              {activeTeamPanel ? (
                <section className={styles.detailPanel}>
                  <div className={styles.panelHeader}>
                    <h3>Štatistiky tímu</h3>
                    <span>Zápasy a výsledky</span>
                  </div>

                  {detailLoading[teamPanelKey] ? (
                    <div className={styles.emptyPanel}>Načítavam zápasy...</div>
                  ) : detailErrors[teamPanelKey] ? (
                    <div className={styles.errorBox}>
                      {detailErrors[teamPanelKey]}
                    </div>
                  ) : null}

                  {competition.watched_teams.map((team) =>
                    renderTeamStats(team, matchesByWatch[team.id])
                  )}
                </section>
              ) : null}

              {activePlayersPanel ? (
                <section className={styles.detailPanel}>
                  <div className={styles.panelHeader}>
                    <h3>Hráčske štatistiky</h3>
                    <span>Štatistiky zo SZFB bez profilových údajov hráča</span>
                  </div>

                  {detailLoading[playersPanelKey] ? (
                    <div className={styles.emptyPanel}>Načítavam hráčov...</div>
                  ) : detailErrors[playersPanelKey] ? (
                    <div className={styles.errorBox}>
                      {detailErrors[playersPanelKey]}
                    </div>
                  ) : null}

                  {competition.watched_teams.map((team) =>
                    renderPlayerStats(
                      team,
                      playersByWatch[team.id],
                      playerPagesByWatch[team.id]
                    )
                  )}
                </section>
              ) : null}
            </article>
          );
        })}
      </div>

      {playerForm ? (
        <div className={styles.modalBackdrop}>
          <form
            className={styles.modal}
            onSubmit={(event) => {
              event.preventDefault();
              void handlePlayerSave();
            }}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Úprava hráča</p>
                <h3>{playerForm.playerName}</h3>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setPlayerForm(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Číslo dresu</span>
                <input
                  value={playerForm.jerseyNumber}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? { ...current, jerseyNumber: event.target.value }
                        : current
                    )
                  }
                  type="number"
                  min="0"
                />
              </label>

              <label className={styles.field}>
                <span>Pozícia</span>
                <input
                  value={playerForm.playerPosition}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? { ...current, playerPosition: event.target.value }
                        : current
                    )
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Bio</span>
                <textarea
                  value={playerForm.bio}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current ? { ...current, bio: event.target.value } : current
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Poradie zobrazenia</span>
                <input
                  value={playerForm.displayOrder}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? { ...current, displayOrder: event.target.value }
                        : current
                    )
                  }
                  type="number"
                  min="0"
                />
              </label>

              <label className={styles.field}>
                <span>Fotka</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? {
                            ...current,
                            photoFile: event.target.files?.[0] || null,
                          }
                        : current
                    )
                  }
                />
              </label>

              {playerForm.photoUrl ? (
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span>Aktuálna fotka</span>
                  <img
                    className={styles.playerPreviewImage}
                    src={playerForm.photoUrl}
                    alt={playerForm.playerName}
                    loading="lazy"
                  />
                </div>
              ) : null}

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={playerForm.isActive}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? { ...current, isActive: event.target.checked }
                        : current
                    )
                  }
                />
                Aktívny hráč
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={playerForm.isFeatured}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? { ...current, isFeatured: event.target.checked }
                        : current
                    )
                  }
                />
                Zvýraznený hráč
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={playerForm.clearPhoto}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current
                        ? { ...current, clearPhoto: event.target.checked }
                        : current
                    )
                  }
                />
                Zmazať aktuálnu fotku
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPlayerForm(null)}
              >
                Zrušiť
              </button>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSavingModal}
              >
                {isSavingModal ? "Ukladám..." : "Uložiť hráča"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {settingsForm ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>SZFB nastavenie</p>
                <h3>
                  {settingsForm.mode === "edit"
                    ? "Upraviť sledovanie"
                    : "Nové sledovanie"}
                </h3>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setSettingsForm(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>SZFB competition ID</span>
                <input
                  value={settingsForm.szfbCompetitionId}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            szfbCompetitionId: event.target.value,
                          }
                        : current
                    )
                  }
                  type="number"
                  min="1"
                />
              </label>

              <label className={styles.field}>
                <span>Sezóna</span>
                <input
                  value={settingsForm.competitionSeason}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            competitionSeason: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="2026/2027"
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Názov súťaže</span>
                <input
                  value={settingsForm.competitionName}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            competitionName: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Source URL</span>
                <input
                  value={settingsForm.competitionSourceUrl}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            competitionSourceUrl: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Standings URL</span>
                <input
                  value={settingsForm.standingsUrl}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            standingsUrl: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Results URL</span>
                <input
                  value={settingsForm.resultsUrl}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            resultsUrl: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Label tímu</span>
                <input
                  value={settingsForm.label}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            label: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="Juniori"
                />
              </label>

              <label className={styles.field}>
                <span>Team name zo SZFB</span>
                <input
                  value={settingsForm.teamName}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            teamName: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="FaBK ATU Košice"
                />
              </label>

              <label className={styles.field}>
                <span>Competitor ID</span>
                <input
                  value={settingsForm.competitorId}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            competitorId: event.target.value,
                          }
                        : current
                    )
                  }
                  type="number"
                  min="1"
                />
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settingsForm.isActive}
                  onChange={(event) =>
                    setSettingsForm((current) =>
                      current
                        ? {
                            ...current,
                            isActive: event.target.checked,
                          }
                        : current
                    )
                  }
                />
                Aktívne sledovanie
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setSettingsForm(null)}
              >
                Zrušiť
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleSettingsSave()}
                disabled={isSavingModal}
              >
                {isSavingModal ? "Ukladám..." : "Uložiť nastavenie"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
