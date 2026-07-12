import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicPageUrl } from "../../api/config";
import { deletePage, getPages } from "../../api/pages";
import type { AdminPage } from "../../types/page";
import styles from "./PagesAdmin.module.css";

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: "Domov",
  about: "O klube",
  contact: "Kontakt",
  recruitment: "Nábor / Pridaj sa",
  category: "Kategória tímu",
  team_category: "Kategória tímu (starý typ)",
  articles: "Články",
  custom: "Vlastná stránka",
  standard: "Štandardná stránka",
};

const MENU_GROUP_LABELS: Record<string, string> = {
  hidden: "Nezobrazovať v menu",
  main: "Hlavné menu",
  youth: "Dropdown Mládež",
  cta: "CTA tlačidlo",
  footer: "Iba footer",
};

function getPageTypeLabel(value: string) {
  return PAGE_TYPE_LABELS[value] ?? value;
}

function getMenuGroupLabel(value: string) {
  return MENU_GROUP_LABELS[value] ?? (value || "—");
}

function getPublicHref(page: AdminPage) {
  return getPublicPageUrl(page.public_path || "/");
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
    ) {
      return (data as { detail: string }).detail;
    }
  }

  return fallback;
}

export default function PagesListPage() {
  const navigate = useNavigate();

  const [pages, setPages] = useState<AdminPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageTypeFilter, setPageTypeFilter] = useState("all");
  const [menuGroupFilter, setMenuGroupFilter] = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [deletingPageId, setDeletingPageId] = useState<number | null>(null);

  useEffect(() => {
    const loadPages = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPages();
        setPages(
          [...data].sort(
            (a, b) =>
              a.navigation_order - b.navigation_order ||
              a.title.localeCompare(b.title, "sk")
          )
        );
      } catch (err) {
        console.error("Načítanie stránok zlyhalo", err);
        setError("Nepodarilo sa načítať stránky.");
      } finally {
        setLoading(false);
      }
    };

    loadPages();
  }, []);

  const pageTypeOptions = useMemo(() => {
    return Array.from(new Set(pages.map((page) => page.page_type))).sort();
  }, [pages]);

  const menuGroupOptions = useMemo(() => {
    return Array.from(new Set(pages.map((page) => page.menu_group))).sort();
  }, [pages]);

  const filteredPages = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesSearch =
        !normalizedSearch ||
        page.title.toLowerCase().includes(normalizedSearch) ||
        page.slug.toLowerCase().includes(normalizedSearch) ||
        page.menu_title.toLowerCase().includes(normalizedSearch) ||
        page.public_path.toLowerCase().includes(normalizedSearch);

      const matchesType =
        pageTypeFilter === "all" || page.page_type === pageTypeFilter;

      const matchesMenuGroup =
        menuGroupFilter === "all" || page.menu_group === menuGroupFilter;

      const matchesPublished =
        publishedFilter === "all" ||
        (publishedFilter === "published" && page.is_published) ||
        (publishedFilter === "draft" && !page.is_published);

      return matchesSearch && matchesType && matchesMenuGroup && matchesPublished;
    });
  }, [pages, search, pageTypeFilter, menuGroupFilter, publishedFilter]);

  const handleDeletePage = async (page: AdminPage) => {
    if (!page.is_deletable) {
      setError("Systémová stránka – nie je možné ju odstrániť.");
      return;
    }

    const confirmed = window.confirm(
      `Naozaj chceš odstrániť stránku "${page.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPageId(page.id);
      setError("");
      await deletePage(page.id);
      setPages((current) => current.filter((item) => item.id !== page.id));
    } catch (err) {
      console.error("Odstránenie stránky zlyhalo", err);
      setError(
        getApiErrorMessage(err, "Stránku sa nepodarilo odstrániť.")
      );
    } finally {
      setDeletingPageId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.headingWrap}>
          <h1 className={styles.title}>Stránky</h1>
          <p className={styles.subtitle}>
            Prehľad existujúcich stránok klubov a ich základného nastavenia.
          </p>
        </div>

        <div className={styles.pageActions}>
          <Link to="/pages/new?type=custom" className={styles.primaryButton}>
            + Pridať vlastnú stránku
          </Link>
          <Link to="/pages/new" className={styles.secondaryButton}>
            + Pridať stránku
          </Link>
        </div>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Vyhľadávanie</label>
            <input
              className={styles.input}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hľadať podľa názvu, slugu, menu alebo URL"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Typ stránky</label>
            <select
              className={styles.input}
              value={pageTypeFilter}
              onChange={(event) => setPageTypeFilter(event.target.value)}
            >
              <option value="all">Všetky typy</option>
              {pageTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {getPageTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Menu skupina</label>
            <select
              className={styles.input}
              value={menuGroupFilter}
              onChange={(event) => setMenuGroupFilter(event.target.value)}
            >
              <option value="all">Všetky skupiny</option>
              {menuGroupOptions.map((group) => (
                <option key={group} value={group}>
                  {getMenuGroupLabel(group)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Publikovanie</label>
            <select
              className={styles.input}
              value={publishedFilter}
              onChange={(event) => setPublishedFilter(event.target.value)}
            >
              <option value="all">Všetky</option>
              <option value="published">Publikované</option>
              <option value="draft">Nepublikované</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateCard}>Načítavam stránky...</div>
      ) : error ? (
        <div className={`${styles.stateCard} ${styles.errorCard}`}>{error}</div>
      ) : filteredPages.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Žiadne stránky</h2>
          <p className={styles.emptyText}>
            Skúste upraviť filtre alebo vyhľadávanie.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Názov</th>
                <th>Typ</th>
                <th>Public URL</th>
                <th>Menu</th>
                <th>Header</th>
                <th>Footer</th>
                <th>Status</th>
                <th>Poradie</th>
                <th>Akcie</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr key={page.id} onClick={() => navigate(`/pages/${page.id}`)}>
                  <td className={styles.mainCell}>
                    <p className={styles.pageTitle}>{page.title}</p>
                    <span className={styles.mutedText}>Slug: {page.slug}</span>
                  </td>
                  <td>{getPageTypeLabel(page.page_type)}</td>
                  <td>
                    <span className={styles.pathText}>{page.public_path}</span>
                  </td>
                  <td>{getMenuGroupLabel(page.menu_group)}</td>
                  <td>{page.show_in_header ? "Áno" : "Nie"}</td>
                  <td>{page.show_in_footer ? "Áno" : "Nie"}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        page.is_published
                          ? styles.badgePublished
                          : styles.badgeDraft
                      }`}
                    >
                      {page.is_published ? "Publikované" : "Nepublikované"}
                    </span>
                  </td>
                  <td>{page.navigation_order}</td>
                  <td>
                    <div className={styles.inlineActions}>
                      <Link
                        to={`/pages/${page.id}`}
                        className={styles.secondaryButton}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Upraviť
                      </Link>
                      <a
                        href={getPublicHref(page)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.ghostButton}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Náhľad
                      </a>
                      {page.is_deletable ? (
                        <button
                          type="button"
                          className={styles.dangerActionButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeletePage(page);
                          }}
                          disabled={deletingPageId === page.id}
                        >
                          {deletingPageId === page.id
                            ? "Mažem..."
                            : "Odstrániť"}
                        </button>
                      ) : (
                        <span className={styles.systemPageNotice}>
                          Systémová stránka
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
