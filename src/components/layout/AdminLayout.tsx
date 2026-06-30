import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import styles from "./AdminLayout.module.css";

type NavItem = {
  to: string;
  label: string;
  icon: "dashboard" | "posts" | "pages" | "polls";
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/posts", label: "Články", icon: "posts" },
  { to: "/pages", label: "Stránky", icon: "pages" },
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

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h10a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 16H8.5l-3.02 2.27A.9.9 0 0 1 4 17.55V7.5A2.5 2.5 0 0 1 6.5 5H7Zm1.5 4.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
    </svg>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const activeClub =
    user?.memberships?.find((membership) => membership.is_active) ??
    user?.memberships?.[0];

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
              <img src="/ludimus.png" alt="Ludimus logo" />
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
                <div className={styles.userName}>{user?.username || "guli"}</div>
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
