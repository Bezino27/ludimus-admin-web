import axios from "axios";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAdminClubPlayers,
  getAdminSzfbCompetitions,
  updateAdminClubPlayer,
  type AdminClubPlayer,
  type AdminSzfbCompetition,
} from "../../api/szfb";
import { useAuth } from "../../context/useAuth";
import styles from "./PlayersPage.module.css";

type ActiveFilter = "all" | "true" | "false";

type PlayerFormState = {
  playerId: number;
  fullName: string;
  birthYear: string;
  jerseyNumber: string;
  position: string;
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

type LoadPlayersOptions = {
  watchId?: string;
  season?: string;
  searchValue?: string;
  active?: ActiveFilter;
  page?: number;
  append?: boolean;
};

const PLAYERS_PAGE_SIZE = 25;

function toOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

function formatNumber(value: number | null, suffix = "") {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value}${suffix}`;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<Record<string, unknown>>(error)) {
    const responseData = error.response?.data;

    if (responseData) {
      const firstValue = Object.values(responseData)[0];

      if (Array.isArray(firstValue)) {
        return String(firstValue[0] || "Údaje sa nepodarilo uložiť.");
      }

      if (typeof firstValue === "string") {
        return firstValue;
      }
    }
  }

  return "Údaje sa nepodarilo uložiť.";
}

function getDefaultWatchId(competitions: AdminSzfbCompetition[]) {
  const watchIds = competitions
    .flatMap((competition) => competition.watched_teams.map((watch) => watch.id))
    .filter((watchId) => Number.isFinite(watchId))
    .sort((a, b) => a - b);

  return watchIds.length > 0 ? String(watchIds[0]) : "";
}

export default function PlayersPage() {
  const { user } = useAuth();
  const skipNextFilterLoadRef = useRef(false);

  const [players, setPlayers] = useState<AdminClubPlayer[]>([]);
  const [competitions, setCompetitions] = useState<AdminSzfbCompetition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedWatchId, setSelectedWatchId] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePlayers, setHasMorePlayers] = useState(false);
  const [playersTotalCount, setPlayersTotalCount] = useState(0);
  const [playerForm, setPlayerForm] = useState<PlayerFormState | null>(null);

  const activeClub =
    user?.memberships?.find((membership) => membership.is_active) ??
    user?.memberships?.[0];
  const activeClubSlug = activeClub?.club_slug || "";

  const watchOptions = useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        label: string;
        teamName: string;
        competitionName: string;
        season: string;
      }
    >();

    competitions.forEach((competition) => {
      competition.watched_teams.forEach((watch) => {
        map.set(watch.id, {
          id: watch.id,
          label: watch.label,
          teamName: watch.team_name,
          competitionName: competition.name,
          season: competition.season,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const seasonCompare = b.season.localeCompare(a.season);

      if (seasonCompare !== 0) {
        return seasonCompare;
      }

      return a.label.localeCompare(b.label);
    });
  }, [competitions]);

  const seasonOptions = useMemo(() => {
    const seasons = new Set<string>();

    competitions.forEach((competition) => {
      if (competition.season) {
        seasons.add(competition.season);
      }
    });

    players.forEach((player) => {
      player.categories.forEach((category) => {
        if (category.season) {
          seasons.add(category.season);
        }
      });
    });

    return Array.from(seasons).sort((a, b) => b.localeCompare(a));
  }, [competitions, players]);

  const stats = useMemo(() => {
    const activePlayers = players.filter((player) => player.is_active).length;
    const featuredPlayers = players.filter((player) => player.is_featured).length;
    const withPhoto = players.filter((player) => player.photo_url).length;

    return {
      total: playersTotalCount || players.length,
      active: activePlayers,
      featured: featuredPlayers,
      withPhoto,
    };
  }, [players, playersTotalCount]);

  const loadFilters = useCallback(async () => {
    if (!activeClubSlug) {
      setCompetitions([]);
      return [];
    }

    const data = await getAdminSzfbCompetitions(activeClubSlug);
    setCompetitions(data);
    return data;
  }, [activeClubSlug]);

  const fetchPlayers = useCallback(
    async ({
      watchId,
      season,
      searchValue,
      active,
      page = 1,
      append = false,
    }: LoadPlayersOptions) => {
      if (!activeClubSlug) {
        setPlayers([]);
        setPlayersTotalCount(0);
        setHasMorePlayers(false);
        setErrorMessage("Nepodarilo sa určiť aktívny klub.");
        return;
      }

      const data = await getAdminClubPlayers({
        clubSlug: activeClubSlug,
        watchId: watchId ?? "",
        season: season ?? "",
        search: (searchValue ?? "").trim(),
        active: active ?? "all",
        page,
        pageSize: PLAYERS_PAGE_SIZE,
      });

      setPlayers((current) =>
        append ? [...current, ...data.results] : data.results
      );
      setCurrentPage(page);
      setHasMorePlayers(Boolean(data.next));
      setPlayersTotalCount(data.count);
    },
    [activeClubSlug]
  );

  const loadPlayers = useCallback(async () => {
    await fetchPlayers({
      watchId: selectedWatchId,
      season: selectedSeason,
      searchValue: deferredSearch,
      active: activeFilter,
      page: 1,
      append: false,
    });
  }, [
    activeFilter,
    deferredSearch,
    fetchPlayers,
    selectedSeason,
    selectedWatchId,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setMessage("");
      setHasLoadedInitialData(false);

      try {
        if (!activeClubSlug) {
          if (isMounted) {
            setPlayers([]);
            setPlayersTotalCount(0);
            setHasMorePlayers(false);
            setCompetitions([]);
            setSelectedWatchId("");
            setErrorMessage("Nepodarilo sa určiť aktívny klub.");
          }
          return;
        }

        const competitionData = await loadFilters();

        if (!isMounted) {
          return;
        }

        const defaultWatchId = getDefaultWatchId(competitionData);
        skipNextFilterLoadRef.current = true;
        setSelectedWatchId(defaultWatchId);
        setSelectedSeason("");
        setSearch("");
        setActiveFilter("all");

        await fetchPlayers({
          watchId: defaultWatchId,
          season: "",
          searchValue: "",
          active: "all",
          page: 1,
          append: false,
        });

        if (isMounted) {
          setHasLoadedInitialData(true);
        }
      } catch (error) {
        console.error("Nepodarilo sa načítať hráčov:", error);

        if (isMounted) {
          setErrorMessage("Hráčov sa nepodarilo načítať.");
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
  }, [activeClubSlug, fetchPlayers, loadFilters]);

  useEffect(() => {
    if (!hasLoadedInitialData) {
      return;
    }

    if (skipNextFilterLoadRef.current) {
      skipNextFilterLoadRef.current = false;
      return;
    }

    let isMounted = true;

    const loadFilteredPlayers = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setMessage("");

      try {
        await loadPlayers();
      } catch (error) {
        console.error("Nepodarilo sa načítať hráčov:", error);

        if (isMounted) {
          setErrorMessage("Hráčov sa nepodarilo načítať.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFilteredPlayers();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedInitialData, loadPlayers]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMorePlayers) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage("");
    setMessage("");

    try {
      await fetchPlayers({
        watchId: selectedWatchId,
        season: selectedSeason,
        searchValue: deferredSearch,
        active: activeFilter,
        page: currentPage + 1,
        append: true,
      });
    } catch (error) {
      console.error("Nepodarilo sa načítať ďalších hráčov:", error);
      setErrorMessage("Ďalších hráčov sa nepodarilo načítať.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openPlayerModal = (player: AdminClubPlayer) => {
    setPlayerForm({
      playerId: player.id,
      fullName: player.full_name,
      birthYear:
        player.birth_year === null || player.birth_year === undefined
          ? ""
          : String(player.birth_year),
      jerseyNumber:
        player.jersey_number === null || player.jersey_number === undefined
          ? ""
          : String(player.jersey_number),
      position: player.position || "",
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

  const handlePlayerSave = async () => {
    if (!playerForm || isSaving) {
      return;
    }

    if (!activeClubSlug) {
      setErrorMessage("Nepodarilo sa určiť aktívny klub.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const updatedPlayer = await updateAdminClubPlayer(playerForm.playerId, {
        club_slug: activeClubSlug,
        photo: playerForm.photoFile,
        clear_photo: playerForm.clearPhoto,
        full_name: playerForm.fullName,
        birth_year: toOptionalNumber(playerForm.birthYear),
        jersey_number: toOptionalNumber(playerForm.jerseyNumber),
        position: playerForm.position,
        height_cm: toOptionalNumber(playerForm.heightCm),
        weight_kg: toOptionalNumber(playerForm.weightKg),
        bio: playerForm.bio,
        is_active: playerForm.isActive,
        is_featured: playerForm.isFeatured,
        display_order: toOptionalNumber(playerForm.displayOrder) || 0,
      });

      setPlayers((current) =>
        current.map((player) =>
          player.id === updatedPlayer.id ? updatedPlayer : player
        )
      );
      setPlayerForm(null);
      setMessage("Hráč bol upravený.");
    } catch (error) {
      console.error("Nepodarilo sa uložiť hráča:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Hráči</p>
          <h1>Správa hráčov</h1>
          <p className={styles.subtitle}>
            Upravuj klubové profily hráčov, fotky, čísla, výšku, váhu a bio.
            Štatistiky ostávajú napojené zo SZFB.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
          onClick={() => void loadPlayers()}
            disabled={isLoading || isLoadingMore}
          >
            Obnoviť
          </button>
        </div>
      </header>

      {message ? <div className={styles.messageBox}>{message}</div> : null}
      {errorMessage ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : null}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Hráči spolu</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Aktívni</span>
          <strong>{stats.active}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Zvýraznení</span>
          <strong>{stats.featured}</strong>
        </div>
        <div className={styles.statCard}>
          <span>S fotkou</span>
          <strong>{stats.withPhoto}</strong>
        </div>
      </section>

      <section className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <label className={styles.field}>
            <span>Vyhľadávanie</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Meno hráča"
            />
          </label>

          <label className={styles.field}>
            <span>Kategória / TeamWatch</span>
            <select
              value={selectedWatchId}
              onChange={(event) => setSelectedWatchId(event.target.value)}
            >
              <option value="">Všetky kategórie</option>
              {watchOptions.map((watch) => (
                <option key={watch.id} value={watch.id}>
                  {watch.label} · {watch.season}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Sezóna</span>
            <select
              value={selectedSeason}
              onChange={(event) => setSelectedSeason(event.target.value)}
            >
              <option value="">Všetky sezóny</option>
              {seasonOptions.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Stav</span>
            <select
              value={activeFilter}
              onChange={(event) =>
                setActiveFilter(event.target.value as ActiveFilter)
              }
            >
              <option value="all">Všetci</option>
              <option value="true">Aktívni</option>
              <option value="false">Neaktívni</option>
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className={styles.stateBox}>Načítavam hráčov...</div>
      ) : null}

      {!isLoading && players.length === 0 ? (
        <div className={styles.stateBox}>
          Pre zvolené filtre nie sú dostupní žiadni hráči.
        </div>
      ) : null}

      {players.length > 0 ? (
        <section className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hráč</th>
                  <th>Rok</th>
                  <th>Číslo</th>
                  <th>Pozícia</th>
                  <th>Výška / váha</th>
                  <th>Kategórie</th>
                  <th>Body</th>
                  <th>Stav</th>
                  <th>Úprava</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <div className={styles.playerCell}>
                        <div className={styles.avatar}>
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.full_name} />
                          ) : (
                            <span>{player.full_name.slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <strong>{player.full_name}</strong>
                          <small>ID {player.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{player.birth_year || "—"}</td>
                    <td>{player.jersey_number || "—"}</td>
                    <td>{player.position || "—"}</td>
                    <td>
                      {formatNumber(player.height_cm, " cm")} /{" "}
                      {formatNumber(player.weight_kg, " kg")}
                    </td>
                    <td>
                      <div className={styles.categoryList}>
                        {player.categories.length > 0 ? (
                          player.categories.map((category) => (
                            <span key={category.watch_id} className={styles.badge}>
                              {category.label}
                            </span>
                          ))
                        ) : (
                          <span className={styles.mutedText}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{player.stats_summary.total_points}</strong>
                      <small>
                        {player.stats_summary.total_goals}G ·{" "}
                        {player.stats_summary.total_assists}A
                      </small>
                    </td>
                    <td>
                      <span
                        className={
                          player.is_active
                            ? styles.statusActive
                            : styles.statusInactive
                        }
                      >
                        {player.is_active ? "Aktívny" : "Neaktívny"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.smallButton}
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

          {hasMorePlayers ? (
            <div className={styles.loadMoreRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Načítavam..." : "Načítať ďalších"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

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
                <h3>{playerForm.fullName}</h3>
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
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Meno hráča</span>
                <input
                  value={playerForm.fullName}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current ? { ...current, fullName: event.target.value } : current
                    )
                  }
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Rok narodenia</span>
                <input
                  value={playerForm.birthYear}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current ? { ...current, birthYear: event.target.value } : current
                    )
                  }
                  type="number"
                  min="1900"
                />
              </label>

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
                  value={playerForm.position}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current ? { ...current, position: event.target.value } : current
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Poradie</span>
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
                <span>Výška (cm)</span>
                <input
                  value={playerForm.heightCm}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current ? { ...current, heightCm: event.target.value } : current
                    )
                  }
                  type="number"
                  min="0"
                />
              </label>

              <label className={styles.field}>
                <span>Váha (kg)</span>
                <input
                  value={playerForm.weightKg}
                  onChange={(event) =>
                    setPlayerForm((current) =>
                      current ? { ...current, weightKg: event.target.value } : current
                    )
                  }
                  type="number"
                  min="0"
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
                    className={styles.previewImage}
                    src={playerForm.photoUrl}
                    alt={playerForm.fullName}
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
                disabled={isSaving}
              >
                {isSaving ? "Ukladám..." : "Uložiť hráča"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
