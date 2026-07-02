import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  getCurrentClubSeason,
  updateCurrentClubSeason,
} from "../../api/pages";
import { useAuth } from "../../context/useAuth";
import type { AdminClubSeason } from "../../types/page";
import styles from "./AdminLayout.module.css";

type NavItem = {
  to: string;
  label: string;
  icon:
    | "dashboard"
    | "posts"
    | "pages"
    | "polls"
    | "club-info"
    | "categories";
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/pages", label: "Stránky", icon: "pages" },
  { to: "/club-info", label: "Klubové informácie", icon: "club-info" },
  { to: "/categories", label: "Kategórie", icon: "categories" },
  { to: "/posts", label: "Články", icon: "posts" },
  { to: "/polls", label: "Ankety", icon: "polls" },
];

function NavIcon({ name }: { name: NavItem["icon"] }) {
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
      </svg>
    );
  }

  if (name === "posts") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h12a2 2 0 0 1 2 2v12.5a1.5 1.5 0 0 1-2.28 1.28L15.8 18.6a1.5 1.5 0 0 0-.78-.22H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4.25a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5H8Zm0 3.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5H8Z" />
      </svg>
    );
  }

  if (name === "pages") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h7.2c.4 0 .78.16 1.06.44l3.8 3.8c.28.28.44.66.44 1.06V18A2.5 2.5 0 0 1 17 20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Zm7 1.9V8a1 1 0 0 0 1 1h2.6L14 5.4ZM8 12a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5H8Zm0 3a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5H8Z" />
      </svg>
    );
  }

  if (name === "club-info") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V9.35L12 4l8 5.35V20h-5.25v-5.75h-5.5V20H4Zm2-2h1.25v-5.75h9.5V18H18V10.42l-6-4.02-6 4.02V18Zm3-8.25h6v1.8H9v-1.8Z" />
      </svg>
    );
  }

  if (name === "categories") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h3A2.5 2.5 0 0 1 12 5.5v3A2.5 2.5 0 0 1 9.5 11h-3A2.5 2.5 0 0 1 4 8.5v-3Zm8 0A2.5 2.5 0 0 1 14.5 3h3A2.5 2.5 0 0 1 20 5.5v3a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 12 8.5v-3ZM4 15.5A2.5 2.5 0 0 1 6.5 13h3a2.5 2.5 0 0 1 2.5 2.5v3A2.5 2.5 0 0 1 9.5 21h-3A2.5 2.5 0 0 1 4 18.5v-3Zm8 0a2.5 2.5 0 0 1 2.5-2.5h3a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-2.5 2.5h-3a2.5 2.5 0 0 1-2.5-2.5v-3Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h10a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 16H8.5l-3.02 2.27A.9.9 0 0 1 4 17.55V7.5A2.5 2.5 0 0 1 6.5 5H7Zm1.5 4.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
    </svg>
  );
}

function getSeasonStartYear(season: string) {
  const match = season.match(/^(\d{4})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function formatSeason(startYear: number) {
  return `${startYear}/${startYear + 1}`;
}

function getFallbackSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 6 ? year : year - 1;

  return formatSeason(startYear);
}

function buildSeasonOptions(clubSeason: AdminClubSeason | null) {
  const seasons = new Set<string>();

  clubSeason?.available_seasons?.forEach((season) => {
    if (season) {
      seasons.add(season);
    }
  });

  if (clubSeason?.season) {
    seasons.add(clubSeason.season);
  }

  const baseSeason = clubSeason?.season || getFallbackSeason();
  const startYear = getSeasonStartYear(baseSeason);

  if (startYear) {
    for (let offset = -2; offset <= 2; offset += 1) {
      seasons.add(formatSeason(startYear + offset));
    }
  }

  return Array.from(seasons).sort((a, b) => b.localeCompare(a));
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [clubSeason, setClubSeason] = useState<AdminClubSeason | null>(null);
  const [seasonStatus, setSeasonStatus] = useState("");
  const [isSeasonLoading, setIsSeasonLoading] = useState(false);
  const [isSeasonSaving, setIsSeasonSaving] = useState(false);

  const activeClub =
    user?.memberships?.find((membership) => membership.is_active) ??
    user?.memberships?.[0];

  const activeClubSlug = activeClub?.club_slug || "";

  const seasonOptions = useMemo(
    () => buildSeasonOptions(clubSeason),
    [clubSeason]
  );

  useEffect(() => {
    if (!activeClubSlug) {
      return;
    }

    let isMounted = true;

    const loadSeason = async () => {
      setIsSeasonLoading(true);
      setSeasonStatus("");

      try {
        const data = await getCurrentClubSeason(activeClubSlug);

        if (isMounted) {
          setClubSeason(data);
        }
      } catch (error) {
        console.error("Nepodarilo sa načítať sezónu klubu:", error);

        if (isMounted) {
          setSeasonStatus("Sezónu sa nepodarilo načítať.");
        }
      } finally {
        if (isMounted) {
          setIsSeasonLoading(false);
        }
      }
    };

    void loadSeason();

    return () => {
      isMounted = false;
    };
  }, [activeClubSlug]);

  const handleSeasonChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextSeason = event.target.value;

    if (!activeClubSlug || !nextSeason || nextSeason === clubSeason?.season) {
      return;
    }

    setIsSeasonSaving(true);
    setSeasonStatus("");

    try {
      const data = await updateCurrentClubSeason(activeClubSlug, {
        season: nextSeason,
        recalculate_categories: true,
      });

      setClubSeason(data);
      setSeasonStatus("Sezóna prepnutá.");
    } catch (error) {
      console.error("Nepodarilo sa zmeniť sezónu klubu:", error);
      setSeasonStatus("Zmenu sezóny sa nepodarilo uložiť.");
    } finally {
      setIsSeasonSaving(false);
    }
  };

  const isActive = (to: string) => {
    if (to === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === to ||
      location.pathname.startsWith(`${to}/`) ||
      location.pathname === `/admin${to}` ||
      location.pathname.startsWith(`/admin${to}/`)
    );
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.brand}>
            <div className={styles.brandMark}>
              <img src="/image.png" alt="Ludimus logo" />
            </div>

            <div>
              <h2 className={styles.brandTitle}>Ludimus</h2>
              <p className={styles.brandSubtitle}>Admin panel</p>
            </div>
          </div>

          <div className={styles.contextStack}>
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>
                {(user?.username || "guli").slice(0, 1).toUpperCase()}
              </div>

              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user?.username || "guli"}
                </div>
                <div className={styles.userMeta}>
                  {user?.email || "Prihlásený používateľ"}
                </div>
              </div>
            </div>

            <div className={styles.clubCard}>
              <div className={styles.clubAvatar}>
                {(activeClub?.club_name || "Klub").slice(0, 1).toUpperCase()}
              </div>

              <div className={styles.clubInfo}>
                <div className={styles.clubName}>
                  {activeClub?.club_name || "Aktívny klub"}
                </div>
                <div className={styles.clubMeta}>
                  {activeClub?.club_slug || "Klubový web"}
                </div>
              </div>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Admin navigácia">
            <div className={styles.seasonSwitcher}>
              <div className={styles.seasonSwitcherTop}>
                <span className={styles.seasonLabel}>Sezóna</span>

                {isSeasonSaving ? (
                  <span className={styles.seasonSaving}>Ukladám</span>
                ) : null}
              </div>

              <select
                className={styles.seasonSelect}
                value={clubSeason?.season || ""}
                onChange={handleSeasonChange}
                disabled={!activeClubSlug || isSeasonLoading || isSeasonSaving}
                aria-label="Vybrať aktívnu sezónu"
              >
                {!clubSeason?.season ? (
                  <option value="">
                    {isSeasonLoading ? "Načítavam..." : "Vybrať sezónu"}
                  </option>
                ) : null}

                {seasonOptions.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>

              {seasonStatus ? (
                <div
                  className={
                    seasonStatus === "Sezóna prepnutá."
                      ? styles.seasonStatusSuccess
                      : styles.seasonStatusError
                  }
                >
                  {seasonStatus}
                </div>
              ) : (
                <div className={styles.seasonHint}>Aktívna sezóna klubu</div>
              )}
            </div>

            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${styles.navLink} ${
                  isActive(item.to) ? styles.navLinkActive : ""
                }`}
              >
                <span className={styles.navIcon}>
                  <NavIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <button type="button" onClick={logout} className={styles.logoutButton}>
          Odhlásiť sa
        </button>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}