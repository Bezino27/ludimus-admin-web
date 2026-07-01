import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getPublicPageUrl } from "../../api/config";
import SectionEditorModal from "./SectionEditorModal";
import {
  createPageSection,
  deletePage,
  deletePageSection,
  getPage,
  getPageSectionOptions,
  getPageSections,
  getTeamCategories,
  reorderPageSections,
  updatePage,
} from "../../api/pages";
import type {
  AdminPage,
  AdminPagePayload,
  AdminPageSection,
  AdminTeamCategory,
  SectionOption,
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

const SYSTEM_PAGE_PATHS: Record<string, string> = {
  home: "/",
  about: "/o-klube",
  contact: "/kontakt",
  recruitment: "/pridaj_sa",
  articles: "/clanky",
};

function isSystemPageType(pageType: string) {
  return pageType in SYSTEM_PAGE_PATHS;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  top_posts: "Najdôležitejšie novinky",
  posts: "Články / novinky",
  matches_overview: "Zápasy + tabuľka",
  next_match: "Najbližší zápas",
  recent_matches: "Posledné zápasy",
  standings: "Tabuľka",
  leaders: "Lídri sezóny",
  partners: "Partneri",
  poll: "Anketa",
  recruitment: "Nábor",
  benefits: "Benefity",
  team_categories: "Kategórie tímov",
  faq: "Časté otázky",
  trainings: "Tréningy",
  links: "Klubové odkazy",
  custom_links: "Vlastné odkazy",
  contact: "Kontakt",
  documents: "Klubové dokumenty",
  custom_documents: "Vlastné dokumenty",
  gallery: "Galéria",
  achievements: "Úspechy",
  custom_text: "Vlastný text",
  about_overview: "Prehľad o klube s mapou",
  about_text: "Textová sekcia o klube",
  famous_players: "Známi hráči / odchovanci",
};

function toPayload(page: AdminPage): AdminPagePayload {
  return {
    title: page.title,
    slug: page.slug,
    page_type: page.page_type,
    is_homepage: page.is_homepage,
    is_published: page.is_published,
    menu_title: page.menu_title,
    show_in_header: page.show_in_header,
    show_in_footer: page.show_in_footer,
    menu_group: page.menu_group,
    menu_group_title: page.menu_group_title,
    team_category: page.team_category ?? null,
    navigation_order: page.navigation_order,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
  };
}

function getPageTypeLabel(value: string) {
  return PAGE_TYPE_OPTIONS.find(([key]) => key === value)?.[1] ?? value;
}

function getSectionTypeLabel(value: string) {
  return SECTION_TYPE_LABELS[value] ?? value;
}

function renumberSections(sections: AdminPageSection[]) {
  return sections.map((section, index) => ({
    ...section,
    order: index + 1,
  }));
}

function moveSection(
  sections: AdminPageSection[],
  index: number,
  direction: -1 | 1
) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  const next = [...sections];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return renumberSections(next);
}

function reorderSectionsByDrag(
  sections: AdminPageSection[],
  sourceId: number,
  targetId: number
) {
  const sourceIndex = sections.findIndex((section) => section.id === sourceId);
  const targetIndex = sections.findIndex((section) => section.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return sections;
  }

  const next = [...sections];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return renumberSections(next);
}

type SectionDragMeta = {
  sourceId: number;
  startTop: number;
  grabOffsetY: number;
  minTop: number;
  maxTop: number;
  itemHeight: number;
  centers: Array<{
    id: number;
    centerY: number;
  }>;
};

type SectionModalState =
  | {
      mode: "create";
      section: null;
    }
  | {
      mode: "edit";
      section: AdminPageSection;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function PageDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [page, setPage] = useState<AdminPage | null>(null);
  const [formValues, setFormValues] = useState<AdminPagePayload | null>(null);
  const [sections, setSections] = useState<AdminPageSection[]>([]);
  const [sectionOptions, setSectionOptions] = useState<SectionOption[]>([]);
  const [teamCategories, setTeamCategories] = useState<AdminTeamCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionsError, setSectionsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingPage, setDeletingPage] = useState(false);
  const [sectionDeletingId, setSectionDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [sectionModal, setSectionModal] = useState<SectionModalState | null>(null);
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<number | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<number | null>(null);
  const [dragTransformY, setDragTransformY] = useState(0);

  const sectionsListRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<number, HTMLElement>());
  const sectionDragMetaRef = useRef<SectionDragMeta | null>(null);

  const publicHref = useMemo(
    () => getPublicPageUrl(page?.public_path || "/"),
    [page?.public_path]
  );

  const isSystemPage = formValues ? isSystemPageType(formValues.page_type) : false;
  const isCategoryPage = formValues?.page_type === "category";

  const publicPathPreview = useMemo(() => {
    if (!formValues) return page?.public_path || "/";

    if (SYSTEM_PAGE_PATHS[formValues.page_type]) {
      return page?.public_path || SYSTEM_PAGE_PATHS[formValues.page_type];
    }

    if (formValues.page_type === "category") {
      return `/kategorie/${formValues.slug || "slug-stranky"}`;
    }

    if (formValues.page_type === "custom") {
      return `/stranka/${formValues.slug || "slug-stranky"}`;
    }

    return `/${formValues.slug || "slug-stranky"}`;
  }, [formValues, page?.public_path]);

  const loadDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const data = await getPage(id);
      setPage(data);
      setFormValues(toPayload(data));
    } catch (err) {
      console.error("Načítanie stránky zlyhalo", err);
      setError("Nepodarilo sa načítať stránku.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSections = useCallback(async () => {
    if (!id) return;

    try {
      setSectionsLoading(true);
      setSectionsError("");

      const data = await getPageSections(id);
      setSections(renumberSections(data));
    } catch (err) {
      console.error("Načítanie sekcií zlyhalo", err);
      setSectionsError("Nepodarilo sa načítať sekcie stránky.");
    } finally {
      setSectionsLoading(false);
    }
  }, [id]);

  const loadSectionOptions = useCallback(async () => {
    if (!id) return;

    try {
      const data = await getPageSectionOptions(id);
      setSectionOptions(data.items);
    } catch (err) {
      console.error("Načítanie typov sekcií zlyhalo", err);
      setSectionOptions([]);
    }
  }, [id]);

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

  useEffect(() => {
    loadDetail();
    loadSections();
    loadSectionOptions();
  }, [loadDetail, loadSectionOptions, loadSections]);

  useEffect(() => {
    const state = location.state as { successMessage?: string } | null;
    if (state?.successMessage) {
      setSuccessMessage(state.successMessage);
    }
  }, [location.state]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = event.target as HTMLInputElement;
    const { name, value, type } = target;

    setFormValues((prev) => {
      if (!prev) return prev;

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

      if (name === "page_type" && value !== "category") {
        next.team_category = null;
      }

      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!id || !formValues) return;

    if (formValues.page_type === "category" && !formValues.team_category) {
      setError("Vyber napojenú tímovú kategóriu.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      await updatePage(id, formValues);
      await loadDetail();
      setSuccessMessage("Stránka bola uložená.");
    } catch (err) {
      console.error("Uloženie stránky zlyhalo", err);
      setError("Uloženie stránky sa nepodarilo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async () => {
    if (!id || !page) return;

    const confirmed = window.confirm(
      `Naozaj chceš odstrániť stránku "${page.title}"? Táto akcia odstráni aj jej sekcie a nedá sa vrátiť späť.`
    );
    if (!confirmed) return;

    try {
      setDeletingPage(true);
      setError("");
      await deletePage(id);
      navigate("/pages", {
        replace: true,
        state: { successMessage: "Stránka bola odstránená." },
      });
    } catch (err) {
      console.error("Odstránenie stránky zlyhalo", err);
      setError("Stránku sa nepodarilo odstrániť.");
    } finally {
      setDeletingPage(false);
    }
  };

  const saveSectionOrder = async (
    nextSections: AdminPageSection[],
    previousSections: AdminPageSection[],
    activeSectionId: number | null
  ) => {
    setSections(nextSections);
    setSectionsError("");
    setSuccessMessage("");
    setReorderingId(activeSectionId);

    try {
      const savedSections = await reorderPageSections(
        nextSections.map((section) => ({
          id: section.id,
          order: section.order,
        }))
      );

      setSections(renumberSections(savedSections));
      setSuccessMessage("Poradie sekcií bolo uložené.");
    } catch (err) {
      console.error("Zmena poradia sekcií zlyhala", err);
      setSections(previousSections);
      setSectionsError("Poradie sekcií sa nepodarilo uložiť.");
    } finally {
      setReorderingId(null);
    }
  };

  const handleMoveSection = async (index: number, direction: -1 | 1) => {
    const previousSections = sections;
    const nextSections = moveSection(sections, index, direction);

    if (nextSections === sections) return;

    await saveSectionOrder(
      nextSections,
      previousSections,
      previousSections[index]?.id ?? null
    );
  };

  const getSectionLabel = (sectionType: string) => {
    return (
      sectionOptions.find((option) => option.value === sectionType)?.label ??
      getSectionTypeLabel(sectionType)
    );
  };

  const openCreateSectionModal = () => {
    setSectionsError("");
    setSectionModal({ mode: "create", section: null });
  };

  const openEditSectionModal = (section: AdminPageSection) => {
    setSectionsError("");
    setSectionModal({ mode: "edit", section });
  };

  const closeSectionModal = () => {
    setSectionModal(null);
  };

  const handleDeleteSection = async (section: AdminPageSection) => {
    const confirmed = window.confirm(
      "Naozaj chceš odstrániť túto sekciu? Táto akcia môže odstrániť aj jej obsah."
    );
    if (!confirmed) return;

    try {
      setSectionDeletingId(section.id);
      setSectionsError("");
      setSuccessMessage("");

      await deletePageSection(section.id);

      const remainingSections = renumberSections(
        sections.filter((item) => item.id !== section.id)
      );

      if (remainingSections.length > 0) {
        const savedSections = await reorderPageSections(
          remainingSections.map((item) => ({
            id: item.id,
            order: item.order,
          }))
        );
        setSections(renumberSections(savedSections));
      } else {
        setSections([]);
      }

      await loadSections();
      setSuccessMessage("Sekcia bola odstránená.");
    } catch (err) {
      console.error("Odstránenie sekcie zlyhalo", err);
      setSectionsError("Sekciu sa nepodarilo odstrániť.");
    } finally {
      setSectionDeletingId(null);
    }
  };

  const resetSectionDrag = () => {
    sectionDragMetaRef.current = null;
    setDraggingSectionId(null);
    setDragOverSectionId(null);
    setDragTransformY(0);
  };

  const getClosestDragTargetId = (pointerCenterY: number) => {
    const meta = sectionDragMetaRef.current;
    if (!meta) return null;

    return meta.centers.reduce(
      (closest, item) => {
        const distance = Math.abs(item.centerY - pointerCenterY);
        return distance < closest.distance
          ? { id: item.id, distance }
          : closest;
      },
      { id: meta.sourceId, distance: Number.POSITIVE_INFINITY }
    ).id;
  };

  const handleSectionPointerDown = (
    event: React.PointerEvent<HTMLElement>,
    sectionId: number
  ) => {
    if (reorderingId !== null || event.button !== 0) return;

    const interactiveTarget = (event.target as HTMLElement).closest(
      "button, a, input, textarea, select"
    );
    if (interactiveTarget) return;

    const rowElement = sectionRefs.current.get(sectionId);
    const listElement = sectionsListRef.current;
    if (!rowElement || !listElement) return;

    const rowRect = rowElement.getBoundingClientRect();
    const listRect = listElement.getBoundingClientRect();

    sectionDragMetaRef.current = {
      sourceId: sectionId,
      startTop: rowRect.top,
      grabOffsetY: event.clientY - rowRect.top,
      minTop: listRect.top,
      maxTop: Math.max(listRect.top, listRect.bottom - rowRect.height),
      itemHeight: rowRect.height,
      centers: sections.map((section) => {
        const sectionElement = sectionRefs.current.get(section.id);
        const sectionRect = sectionElement?.getBoundingClientRect();

        return {
          id: section.id,
          centerY: sectionRect
            ? sectionRect.top + sectionRect.height / 2
            : rowRect.top + rowRect.height / 2,
        };
      }),
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingSectionId(sectionId);
    setDragOverSectionId(sectionId);
    setDragTransformY(0);
  };

  const handleSectionPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const meta = sectionDragMetaRef.current;
    if (!meta || draggingSectionId === null) return;

    const nextTop = clamp(
      event.clientY - meta.grabOffsetY,
      meta.minTop,
      meta.maxTop
    );
    const pointerCenterY = nextTop + meta.itemHeight / 2;

    setDragTransformY(nextTop - meta.startTop);
    setDragOverSectionId(getClosestDragTargetId(pointerCenterY));
  };

  const handleSectionPointerUp = async (
    event: React.PointerEvent<HTMLElement>
  ) => {
    const meta = sectionDragMetaRef.current;
    const targetSectionId = dragOverSectionId;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetSectionDrag();

    if (!meta || !targetSectionId || meta.sourceId === targetSectionId) return;

    const previousSections = sections;
    const nextSections = reorderSectionsByDrag(
      sections,
      meta.sourceId,
      targetSectionId
    );

    if (nextSections === sections) return;

    await saveSectionOrder(nextSections, previousSections, meta.sourceId);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.stateCard}>Načítavam stránku...</div>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className={styles.page}>
        <div className={`${styles.stateCard} ${styles.errorCard}`}>{error}</div>
        <Link to="/pages" className={styles.secondaryButton}>
          Späť na zoznam
        </Link>
      </div>
    );
  }

  if (!page || !formValues) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h1 className={styles.emptyTitle}>Stránka neexistuje</h1>
          <p className={styles.emptyText}>Skontrolujte, či máte správny odkaz.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <form className={styles.page} onSubmit={handleSubmit}>
        <div className={styles.detailHeader}>
        <div className={styles.headingWrap}>
          <h1 className={styles.title}>{page.title}</h1>
          <p className={styles.subtitle}>
            {getPageTypeLabel(page.page_type)} ·{" "}
            <span className={styles.pathText}>{page.public_path}</span>
          </p>
          <div className={styles.headerMeta}>
            <span
              className={`${styles.badge} ${
                page.is_published ? styles.badgePublished : styles.badgeDraft
              }`}
            >
              {page.is_published ? "Publikované" : "Nepublikované"}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link to="/pages" className={styles.secondaryButton}>
            Späť na zoznam
          </Link>
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className={styles.ghostButton}
          >
            Zobraziť stránku
          </a>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? "Ukladám..." : "Uložiť"}
          </button>
          <button
            type="button"
            className={styles.dangerActionButton}
            onClick={handleDeletePage}
            disabled={deletingPage}
          >
            {deletingPage ? "Odstraňujem..." : "Odstrániť stránku"}
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

      <div className={styles.detailGrid}>
        <div className={styles.mainColumn}>
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
                  value={formValues.title}
                  onChange={handleChange}
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
                    value={formValues.slug}
                    onChange={handleChange}
                  />
                  <span className={styles.mutedText}>
                    Verejná URL: {publicPathPreview}
                  </span>
                  {isCategoryPage ? (
                    <p className={styles.hintText}>
                      Slug tvorí URL stránky. Napojená kategória určuje, ktoré
                      tímové dáta sa načítajú.
                    </p>
                  ) : null}
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Typ stránky</label>
                <select
                  className={styles.input}
                  name="page_type"
                  value={formValues.page_type}
                  onChange={handleChange}
                  disabled
                >
                  {PAGE_TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {isCategoryPage ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Napojená kategória</label>
                  <select
                    className={styles.input}
                    name="team_category"
                    value={formValues.team_category ?? ""}
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
                    Názov a slug určujú, ako sa stránka zobrazí na webe.
                    Napojená kategória určuje, ktoré tímové dáta sa na stránke
                    načítajú.
                  </p>
                  {!formValues.team_category ? (
                    <p className={styles.warningText}>
                      Táto kategóriová stránka ešte nemá napojenú tímovú
                      kategóriu. Vyber ju, aby sa dáta načítavali správne.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Poradie v navigácii</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  name="navigation_order"
                  value={formValues.navigation_order}
                  onChange={handleChange}
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <div className={styles.checkboxGrid}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      name="is_homepage"
                      checked={formValues.is_homepage}
                      onChange={handleChange}
                    />
                    Domovská stránka
                  </label>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      name="is_published"
                      checked={formValues.is_published}
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
                  value={formValues.menu_title}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Menu skupina</label>
                <select
                  className={styles.input}
                  name="menu_group"
                  value={formValues.menu_group}
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
                  value={formValues.menu_group_title}
                  onChange={handleChange}
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <div className={styles.checkboxGrid}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      name="show_in_header"
                      checked={formValues.show_in_header}
                      onChange={handleChange}
                    />
                    Zobraziť v hlavičke
                  </label>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      name="show_in_footer"
                      checked={formValues.show_in_footer}
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
                  value={formValues.meta_title}
                  onChange={handleChange}
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>Popis pre Google / zdieľanie</label>
                <textarea
                  className={styles.textarea}
                  name="meta_description"
                  value={formValues.meta_description}
                  onChange={handleChange}
                />
              </div>

              {page.og_image ? (
                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Obrázok pri zdieľaní</label>
                  <img
                    src={page.og_image}
                    alt="Obrázok pri zdieľaní"
                    className={styles.readOnlyImage}
                  />
                  <span className={styles.mutedText}>
                    Upload obrázka doplníme v ďalšej etape.
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.panel}>
            <div className={styles.sectionPanelHeader}>
              <h2 className={styles.panelTitle}>Sekcie stránky</h2>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={openCreateSectionModal}
              >
                + Pridať sekciu
              </button>
            </div>

            {sectionsLoading ? (
              <div className={styles.stateCard}>Načítavam sekcie...</div>
            ) : sectionsError ? (
              <div className={`${styles.stateCard} ${styles.errorCard}`}>
                {sectionsError}
              </div>
            ) : sections.length === 0 ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>Stránka nemá sekcie</h3>
                <p className={styles.emptyText}>
                  Pridaj prvú sekciu a nastav jej základné údaje.
                </p>
              </div>
            ) : (
              <div className={styles.sectionsList} ref={sectionsListRef}>
                {sections.map((section, index) => (
                  <article
                    key={section.id}
                    ref={(element) => {
                      if (element) {
                        sectionRefs.current.set(section.id, element);
                      } else {
                        sectionRefs.current.delete(section.id);
                      }
                    }}
                    className={`${styles.sectionRow} ${
                      draggingSectionId === section.id ? styles.sectionDragging : ""
                    } ${
                      dragOverSectionId === section.id &&
                      draggingSectionId !== section.id
                        ? styles.sectionDragOver
                        : ""
                    }`}
                    style={{
                      transform:
                        draggingSectionId === section.id
                          ? `translateY(${dragTransformY}px)`
                          : undefined,
                    }}
                    onPointerDown={(event) =>
                      handleSectionPointerDown(event, section.id)
                    }
                    onPointerMove={handleSectionPointerMove}
                    onPointerUp={handleSectionPointerUp}
                    onPointerCancel={resetSectionDrag}
                  >
                    <span className={styles.sectionOrder}>{section.order}</span>

                    <div className={styles.sectionBody}>
                      <h3 className={styles.sectionTitle}>
                        {getSectionLabel(section.section_type)}
                      </h3>
                      <div className={styles.sectionMeta}>
                        <span
                          className={`${styles.badge} ${
                            section.is_active
                              ? styles.badgePublished
                              : styles.badgeDraft
                          }`}
                        >
                          {section.is_active ? "Aktívna" : "Neaktívna"}
                        </span>
                        {section.hide_when_empty ? (
                          <span className={styles.badge}>Skryť prázdnu</span>
                        ) : null}
                      </div>
                    </div>

                    <div className={styles.sectionControls}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Posunúť vyššie"
                        onClick={() => handleMoveSection(index, -1)}
                        disabled={index === 0 || reorderingId !== null}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Posunúť nižšie"
                        onClick={() => handleMoveSection(index, 1)}
                        disabled={
                          index === sections.length - 1 || reorderingId !== null
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={styles.sectionTextButton}
                        onClick={() => openEditSectionModal(section)}
                      >
                        Upraviť
                      </button>
                      <button
                        type="button"
                        className={`${styles.sectionTextButton} ${styles.dangerButton}`}
                        onClick={() => handleDeleteSection(section)}
                        disabled={sectionDeletingId === section.id}
                      >
                        {sectionDeletingId === section.id
                          ? "Odstraňujem..."
                          : "Odstrániť"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      </form>

      {sectionModal ? (
        <SectionEditorModal
          mode={sectionModal.mode}
          pageId={Number(id)}
          section={sectionModal.section}
          sectionOptions={sectionOptions}
          onClose={closeSectionModal}
          onCreateSection={async (payload) => {
            const maxOrder = sections.reduce(
              (max, section) => Math.max(max, section.order),
              0
            );

            await createPageSection({
              ...payload,
              order: maxOrder + 1,
            });
          }}
          onSaved={async (message) => {
            setSectionModal(null);
            await loadSections();
            setSuccessMessage(message);
          }}
        />
      ) : null}
    </>
  );
}
