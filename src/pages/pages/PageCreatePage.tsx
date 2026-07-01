import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPage, getTeamCategories } from "../../api/pages";
import { useAuth } from "../../context/useAuth";
import type {
  AdminPagePayload,
  AdminTeamCategory,
  CreateAdminPagePayload,
} from "../../types/page";
import styles from "./PagesAdmin.module.css";

const PAGE_TYPE_OPTIONS = [
  ["home", "Domov"],
  ["about", "O klube"],
  ["contact", "Kontakt"],
  ["recruitment", "Nábor / Pridaj sa"],
  ["category", "Kategória tímu"],
  ["articles", "Články"],
  ["custom", "Vlastná stránka"],
  ["standard", "Štandardná stránka"],
];

const MENU_GROUP_OPTIONS = [
  ["hidden", "Nezobrazovať v menu"],
  ["main", "Hlavné menu"],
  ["youth", "Dropdown Mládež"],
  ["cta", "CTA tlačidlo"],
  ["footer", "Iba footer"],
];

const SYSTEM_PAGE_SLUGS: Record<string, string> = {
  home: "home",
  about: "o-klube",
  contact: "kontakt",
  recruitment: "pridaj_sa",
  articles: "clanky",
};

const SYSTEM_PAGE_PATHS: Record<string, string> = {
  home: "/",
  about: "/o-klube",
  contact: "/kontakt",
  recruitment: "/pridaj_sa",
  articles: "/clanky",
};

function isSystemPageType(pageType: string) {
  return pageType in SYSTEM_PAGE_SLUGS;
}

function slugifyText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getDefaultValues(pageType: string): AdminPagePayload {
  return {
    title: "",
    slug: "",
    page_type: pageType,
    is_homepage: false,
    is_published: true,
    menu_title: "",
    show_in_header: false,
    show_in_footer: false,
    menu_group: "hidden",
    menu_group_title: "",
    team_category: null,
    navigation_order: 0,
    meta_title: "",
    meta_description: "",
  };
}

export default function PageCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const activeClub =
    user?.memberships?.find((membership) => membership.is_active) ??
    user?.memberships?.[0];
  const initialPageType = searchParams.get("type") === "custom" ? "custom" : "standard";

  const [values, setValues] = useState<AdminPagePayload>(
    getDefaultValues(initialPageType)
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [teamCategories, setTeamCategories] = useState<AdminTeamCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isCustomShortcut = useMemo(
    () => searchParams.get("type") === "custom",
    [searchParams]
  );

  const isSystemPage = isSystemPageType(values.page_type);

  const publicPathPreview = useMemo(() => {
    if (SYSTEM_PAGE_PATHS[values.page_type]) {
      return SYSTEM_PAGE_PATHS[values.page_type];
    }

    if (values.page_type === "category") {
      return `/kategorie/${values.slug || "slug-stranky"}`;
    }

    if (values.page_type === "custom") {
      return `/stranka/${values.slug || "slug-stranky"}`;
    }

    return `/${values.slug || "slug-stranky"}`;
  }, [values.page_type, values.slug]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await getTeamCategories();
        setTeamCategories(data);
      } catch (err) {
        console.error("Načítanie kategórií zlyhalo", err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = event.target as HTMLInputElement;
    const { name, value, type } = target;

    setValues((prev) => {
      if (name === "page_type") {
        const nextPageType = value;
        const nextSlug = isSystemPageType(nextPageType)
          ? SYSTEM_PAGE_SLUGS[nextPageType]
          : slugifyText(prev.title);

        return {
          ...prev,
          page_type: nextPageType,
          slug: nextSlug,
          team_category: nextPageType === "category" ? prev.team_category : null,
        };
      }

      const next = {
        ...prev,
        [name]:
          type === "checkbox"
            ? target.checked
            : type === "number"
              ? Number(value)
              : name === "team_category"
                ? value
                  ? Number(value)
                  : null
              : value,
      };

      if (name === "title" && !slugTouched && !isSystemPageType(prev.page_type)) {
        next.slug = slugifyText(value);
      }

      return next;
    });

    if (name === "slug") {
      setSlugTouched(true);
    } else if (name === "page_type") {
      setSlugTouched(isSystemPageType(value));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeClub?.club_id) {
      setError("Nie je dostupný klub pre vytvorenie stránky.");
      return;
    }

    if (values.page_type === "category" && !values.team_category) {
      setError("Vyber napojenú tímovú kategóriu.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload: CreateAdminPagePayload = {
        ...values,
        club: activeClub.club_id,
      };
      const page = await createPage(payload);

      setSuccessMessage("Stránka bola vytvorená.");
      navigate(`/pages/${page.id}`, {
        replace: true,
        state: { successMessage: "Stránka bola vytvorená." },
      });
    } catch (err) {
      console.error("Vytvorenie stránky zlyhalo", err);
      setError("Stránku sa nepodarilo vytvoriť.");
    } finally {
      setSaving(false);
    }
  };

  if (!activeClub?.club_id) {
    return (
      <div className={styles.page}>
        <div className={`${styles.stateCard} ${styles.errorCard}`}>
          Nie je dostupný klub pre vytvorenie stránky.
        </div>
        <Link to="/pages" className={styles.secondaryButton}>
          Späť na zoznam
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.page} onSubmit={handleSubmit}>
      <div className={styles.detailHeader}>
        <div className={styles.headingWrap}>
          <h1 className={styles.title}>
            {isCustomShortcut ? "Nová vlastná stránka" : "Nová stránka"}
          </h1>
          <p className={styles.subtitle}>
            Vyplň základné údaje. Predvolené sekcie sa vytvoria automaticky.
          </p>
        </div>

        <div className={styles.actions}>
          <Link to="/pages" className={styles.secondaryButton}>
            Späť na zoznam
          </Link>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? "Vytváram..." : "Vytvoriť stránku"}
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className={`${styles.stateCard} ${styles.successCard}`}>
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className={`${styles.stateCard} ${styles.errorCard}`}>{error}</div>
      ) : null}

      <div className={styles.createGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Základné údaje</h2>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Názov stránky</label>
              <input
                className={styles.input}
                name="title"
                value={values.title}
                onChange={handleChange}
                placeholder="Napr. Letný tábor"
              />
            </div>

            {isSystemPage ? (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Verejná URL</label>
                <div className={styles.readOnlyValue}>{publicPathPreview}</div>
                <p className={styles.hintText}>
                  Táto stránka je systémová. Verejná URL sa nastavuje
                  automaticky podľa typu stránky.
                </p>
              </div>
            ) : (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Slug</label>
                <input
                  className={styles.input}
                  name="slug"
                  value={values.slug}
                  onChange={handleChange}
                  placeholder="letny-tabor"
                />
                <span className={styles.mutedText}>
                  Verejná URL: {publicPathPreview}
                </span>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Typ stránky</label>
              <select
                className={styles.input}
                name="page_type"
                value={values.page_type}
                onChange={handleChange}
              >
                {PAGE_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {values.page_type === "category" ? (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Napojená kategória</label>
                <select
                  className={styles.input}
                  name="team_category"
                  value={values.team_category ?? ""}
                  onChange={handleChange}
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Načítavam kategórie..."
                      : "Vyber kategóriu"}
                  </option>
                  {teamCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.category_subname
                        ? ` (${category.category_subname})`
                        : ""}
                    </option>
                  ))}
                </select>
                <p className={styles.hintText}>
                  Názov a slug určujú, ako sa stránka zobrazí na webe. Napojená
                  kategória určuje, ktoré tímové dáta sa na stránke načítajú.
                </p>
              </div>
            ) : null}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Poradie v navigácii</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                name="navigation_order"
                value={values.navigation_order}
                onChange={handleChange}
              />
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <div className={styles.checkboxGrid}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    name="is_homepage"
                    checked={values.is_homepage}
                    onChange={handleChange}
                  />
                  Domovská stránka
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    name="is_published"
                    checked={values.is_published}
                    onChange={handleChange}
                  />
                  Publikovaná
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Menu / navigácia</h2>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Názov v menu</label>
              <input
                className={styles.input}
                name="menu_title"
                value={values.menu_title}
                onChange={handleChange}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Menu skupina</label>
              <select
                className={styles.input}
                name="menu_group"
                value={values.menu_group}
                onChange={handleChange}
              >
                {MENU_GROUP_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Názov skupiny v menu</label>
              <input
                className={styles.input}
                name="menu_group_title"
                value={values.menu_group_title}
                onChange={handleChange}
              />
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <div className={styles.checkboxGrid}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    name="show_in_header"
                    checked={values.show_in_header}
                    onChange={handleChange}
                  />
                  Zobraziť v hlavičke
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    name="show_in_footer"
                    checked={values.show_in_footer}
                    onChange={handleChange}
                  />
                  Zobraziť vo footeri
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Google / zdieľanie</h2>
            <p className={styles.panelText}>
              Tieto údaje sa používajú vo výsledkoch vyhľadávania a pri
              zdieľaní odkazu. Ak ich necháš prázdne, použijú sa základné
              údaje stránky.
            </p>
          </div>

          <div className={styles.formGrid}>
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Nadpis pre Google / zdieľanie</label>
              <input
                className={styles.input}
                name="meta_title"
                value={values.meta_title}
                onChange={handleChange}
              />
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Popis pre Google / zdieľanie</label>
              <textarea
                className={styles.textarea}
                name="meta_description"
                value={values.meta_description}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
