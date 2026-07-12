import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import {
  createTeamCategory,
  deleteTeamCategory,
  getCurrentClubSeason,
  getTeamCategoriesByClub,
  updateTeamCategory,
} from "../../api/pages";
import { getAdminSzfbCompetitions } from "../../api/szfb";
import { useAuth } from "../../context/useAuth";
import type { AdminSzfbCompetition } from "../../api/szfb";
import type {
  AdminClubSeason,
  AdminTeamCategory,
  AdminTeamCategoryPayload,
} from "../../types/page";
import styles from "./CategoriesPage.module.css";

type MinimalMembership = {
  is_active: boolean;
  club_slug?: string;
  club_name?: string;
};

const emptyForm = {
  id: null as number | null,
  name: "",
  slug: "",
  season: "",
  birth_year_from: 2010,
  birth_year_to: 2010,
  category_subname: "",
  league_name: "",
  hero_image: null as File | null,
  coach_name: "",
  coach_email: "",
  coach_phone: "",
  order: 0,
  is_active: true,
  szfb_team_watch: null as number | null,
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
  const { user } = useAuth();

  const memberships = (user?.memberships ?? []) as MinimalMembership[];

  const activeClub =
    memberships.find((membership) => membership.is_active) ?? memberships[0];

  const activeClubSlug = activeClub?.club_slug || "";

  const [clubSeason, setClubSeason] = useState<AdminClubSeason | null>(null);
  const [categories, setCategories] = useState<AdminTeamCategory[]>([]);
  const [szfbCompetitions, setSzfbCompetitions] = useState<
    AdminSzfbCompetition[]
  >([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedCategory, setSelectedCategory] =
    useState<AdminTeamCategory | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.name.localeCompare(b.name, "sk");
    });
  }, [categories]);

  const stats = useMemo(() => {
    const activeCount = categories.filter((category) => category.is_active).length;
    const hiddenCount = categories.length - activeCount;
    const withCoachCount = categories.filter((category) =>
      category.coach_name.trim()
    ).length;
    const withSzfbCount = categories.filter(
      (category) => category.szfb_watch_id
    ).length;

    return {
      activeCount,
      hiddenCount,
      withCoachCount,
      withSzfbCount,
    };
  }, [categories]);

  const szfbWatchOptions = useMemo(() => {
    return szfbCompetitions
      .flatMap((competition) =>
        competition.watched_teams.map((watch) => ({
          id: watch.id,
          label: watch.label,
          teamName: watch.team_name,
          competitionName: competition.name,
          season: competition.season,
        }))
      )
      .sort((a, b) => {
        const seasonCompare = b.season.localeCompare(a.season);

        if (seasonCompare !== 0) {
          return seasonCompare;
        }

        return a.label.localeCompare(b.label, "sk");
      });
  }, [szfbCompetitions]);

  async function loadData() {
    if (!activeClubSlug) {
      setIsLoading(false);
      setErrorMessage("Nie je vybraný aktívny klub.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const [seasonData, competitionsData] = await Promise.all([
        getCurrentClubSeason(activeClubSlug),
        getAdminSzfbCompetitions(activeClubSlug),
      ]);
      const categoryData = await getTeamCategoriesByClub(
        activeClubSlug,
        seasonData.season
      );

      setClubSeason(seasonData);
      setCategories(categoryData);
      setSzfbCompetitions(competitionsData);

      setForm((current) => ({
        ...current,
        season: current.season || seasonData.season,
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage("Nepodarilo sa načítať kategórie.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClubSlug]);

  function resetForm() {
    setSelectedCategory(null);
    setForm({
      ...emptyForm,
      season: clubSeason?.season || "",
    });
    setMessage("");
    setErrorMessage("");
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target;

    if (type === "checkbox") {
      const target = event.target as HTMLInputElement;

      setForm((current) => ({
        ...current,
        [name]: target.checked,
      }));

      return;
    }

    if (name === "name") {
      setForm((current) => ({
        ...current,
        name: value,
        slug: selectedCategory || current.slug ? current.slug : slugify(value),
      }));

      return;
    }

    if (
      name === "birth_year_from" ||
      name === "birth_year_to" ||
      name === "order" ||
      name === "szfb_team_watch"
    ) {
      setForm((current) => ({
        ...current,
        [name]: value ? Number(value) : name === "szfb_team_watch" ? null : 0,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setForm((current) => ({
      ...current,
      hero_image: file,
    }));
  }

  function handleEdit(category: AdminTeamCategory) {
    setSelectedCategory(category);
    setMessage("");
    setErrorMessage("");

    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      season: category.season,
      birth_year_from: category.birth_year_from,
      birth_year_to: category.birth_year_to,
      category_subname: category.category_subname || "",
      league_name: category.league_name || "",
      hero_image: null,
      coach_name: category.coach_name || "",
      coach_email: category.coach_email || "",
      coach_phone: category.coach_phone || "",
      order: category.order,
      is_active: category.is_active,
      szfb_team_watch: category.szfb_team_watch_id ?? category.szfb_watch_id,
    });

    window.requestAnimationFrame(() => {
      document
        .getElementById("category-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function buildPayload(): AdminTeamCategoryPayload {
    if (!clubSeason?.club) {
      throw new Error("Chýba klub.");
    }

    return {
      club: clubSeason.club,
      name: form.name,
      slug: form.slug,
      season: form.season || clubSeason.season,
      birth_year_from: form.birth_year_from,
      birth_year_to: form.birth_year_to,
      category_subname: form.category_subname,
      league_name: form.league_name,
      hero_image: form.hero_image,
      coach_name: form.coach_name,
      coach_email: form.coach_email,
      coach_phone: form.coach_phone,
      order: form.order,
      is_active: form.is_active,
      szfb_team_watch: form.szfb_team_watch,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const payload = buildPayload();

      if (form.id) {
        await updateTeamCategory(form.id, payload);
        setMessage("Kategória bola upravená.");
      } else {
        await createTeamCategory(payload);
        setMessage("Kategória bola vytvorená.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage("Nepodarilo sa uložiť kategóriu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(
    event: MouseEvent<HTMLButtonElement>,
    category: AdminTeamCategory
  ) {
    event.stopPropagation();

    if (!window.confirm(`Naozaj chceš odstrániť kategóriu ${category.name}?`)) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await deleteTeamCategory(category.id);

      if (selectedCategory?.id === category.id) {
        resetForm();
      }

      setMessage("Kategória bola odstránená.");
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage("Nepodarilo sa odstrániť kategóriu.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditButtonClick(
    event: MouseEvent<HTMLButtonElement>,
    category: AdminTeamCategory
  ) {
    event.stopPropagation();
    handleEdit(category);
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.headingWrap}>
          <p className={styles.eyebrow}>Tímové stránky</p>
          <h1 className={styles.title}>Kategórie</h1>
          <p className={styles.subtitle}>
            Správa kategórií pre klub{" "}
            <strong>{activeClub?.club_name || "Aktívny klub"}</strong>.
            Aktuálna sezóna je <strong>{clubSeason?.season || "—"}</strong>.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={resetForm}
        >
          Nová kategória
        </button>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Sezóna</p>
          <p className={styles.statValue}>{clubSeason?.season || "—"}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Kategórie</p>
          <p className={styles.statValue}>{categories.length}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Aktívne</p>
          <p className={styles.statValue}>{stats.activeCount}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>S trénerom</p>
          <p className={styles.statValue}>{stats.withCoachCount}</p>
        </div>
      </section>

      {errorMessage ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : null}

      {message ? <div className={styles.successBox}>{message}</div> : null}

      <div className={styles.twoColumn}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardEyebrow}>Prehľad</p>
              <h2>Kategórie sezóny {clubSeason?.season || "—"}</h2>
              <p className={styles.cardText}>
                Kliknutím na riadok otvoríš kategóriu do úpravy.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.emptyState}>Načítavam kategórie...</div>
          ) : sortedCategories.length === 0 ? (
            <div className={styles.emptyState}>
              V tejto sezóne zatiaľ nie sú žiadne kategórie.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Por.</th>
                    <th>Kategória</th>
                    <th>Ročníky</th>
                    <th>Tréner</th>
                    <th>SZFB</th>
                    <th>Stav</th>
                    <th>Akcie</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedCategories.map((category) => (
                    <tr
                      key={category.id}
                      onClick={() => handleEdit(category)}
                      className={
                        selectedCategory?.id === category.id
                          ? styles.activeRow
                          : ""
                      }
                    >
                      <td>
                        <span className={styles.orderBadge}>
                          {category.order}
                        </span>
                      </td>

                      <td className={styles.categoryCell}>
                        <strong>{category.name}</strong>
                        <span>{category.slug}</span>
                        {category.category_subname ? (
                          <small>{category.category_subname}</small>
                        ) : null}
                      </td>

                      <td>
                        <strong>{category.display_years}</strong>
                      </td>

                      <td>
                        <strong>{category.coach_name || "—"}</strong>
                        {category.coach_email ? (
                          <span>{category.coach_email}</span>
                        ) : null}
                      </td>

                      <td>
                        {category.szfb_watch_label ? (
                          <>
                            <strong>{category.szfb_watch_label}</strong>
                            <span>{category.szfb_competition_name || ""}</span>
                          </>
                        ) : (
                          <span className={styles.mutedText}>
                            Bez SZFB sledovania
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            category.is_active
                              ? styles.statusActive
                              : styles.statusInactive
                          }
                        >
                          {category.is_active ? "Aktívna" : "Skrytá"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.itemActions}>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={(event) =>
                              handleEditButtonClick(event, category)
                            }
                          >
                            Upraviť
                          </button>

                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={(event) => void handleDelete(event, category)}
                          >
                            Odstrániť
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form
          id="category-form"
          className={styles.sideForm}
          onSubmit={handleSubmit}
        >
          <div>
            <p className={styles.cardEyebrow}>
              {selectedCategory ? "Úprava kategórie" : "Nová kategória"}
            </p>
            <h2>
              {selectedCategory ? selectedCategory.name : "Pridať kategóriu"}
            </h2>
          </div>

          <label className={styles.field}>
            <span>Názov</span>
            <input
              name="name"
              value={form.name}
              onChange={handleInputChange}
              required
              placeholder="Dorast"
            />
          </label>

          <label className={styles.field}>
            <span>Slug</span>
            <input
              name="slug"
              value={form.slug}
              onChange={handleInputChange}
              required
              placeholder="dorast"
            />
          </label>

          <div className={styles.formGridCompact}>
            <label className={styles.field}>
              <span>Sezóna</span>
              <input
                name="season"
                value={form.season}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Poradie</span>
              <input
                name="order"
                type="number"
                value={form.order}
                onChange={handleInputChange}
              />
            </label>
          </div>

          <div className={styles.formGridCompact}>
            <label className={styles.field}>
              <span>Ročník od</span>
              <input
                name="birth_year_from"
                type="number"
                value={form.birth_year_from}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Ročník do</span>
              <input
                name="birth_year_to"
                type="number"
                value={form.birth_year_to}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Krátky názov</span>
            <input
              name="category_subname"
              value={form.category_subname}
              onChange={handleInputChange}
              placeholder="U17"
            />
          </label>

          <label className={styles.field}>
            <span>Názov ligy</span>
            <input
              name="league_name"
              value={form.league_name}
              onChange={handleInputChange}
              placeholder="Slovenská florbalová extraliga"
            />
          </label>

          <label className={styles.field}>
            <span>Hero obrázok</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>

          {selectedCategory?.hero_image_url ? (
            <img
              src={selectedCategory.hero_image_url}
              alt=""
              className={styles.heroPreview}
            />
          ) : null}

          <label className={styles.field}>
            <span>Tréner</span>
            <input
              name="coach_name"
              value={form.coach_name}
              onChange={handleInputChange}
              placeholder="Tomáš Bezeg"
            />
          </label>

          <label className={styles.field}>
            <span>Email trénera</span>
            <input
              name="coach_email"
              type="email"
              value={form.coach_email}
              onChange={handleInputChange}
              placeholder="trener@email.sk"
            />
          </label>

          <label className={styles.field}>
            <span>Telefón trénera</span>
            <input
              name="coach_phone"
              value={form.coach_phone}
              onChange={handleInputChange}
              placeholder="+421..."
            />
          </label>

          <label className={styles.field}>
            <span>SZFB sledovanie</span>
            <select
              name="szfb_team_watch"
              value={form.szfb_team_watch ?? ""}
              onChange={handleInputChange}
            >
              <option value="">Bez SZFB sledovania</option>
              {szfbWatchOptions.map((watch) => (
                <option key={watch.id} value={watch.id}>
                  {watch.label} — {watch.competitionName} ({watch.season})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleInputChange}
            />
            Zobraziť na webe
          </label>

          <div className={styles.formActions}>
            {selectedCategory ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={resetForm}
                disabled={isSaving}
              >
                Zrušiť úpravu
              </button>
            ) : null}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSaving}
            >
              {isSaving
                ? "Ukladám..."
                : selectedCategory
                  ? "Uložiť zmeny"
                  : "Vytvoriť kategóriu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
