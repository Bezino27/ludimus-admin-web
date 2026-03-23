import { useEffect, useMemo, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import { getPostCategories } from "../api/posts";
import { uploadFeaturedImage } from "../api/uploads";
import type { PostCategory, PostFormValues } from "../types/post";
import styles from "./PostForm.module.css";

type Props = {
  initialValues?: PostFormValues;
  onSubmit: (values: PostFormValues) => Promise<void>;
  submitLabel: string;
  clubId: number;
  clubSlug: string;
};

const defaultValues: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: null,
  featured_image_path: null,
  status: "draft",
  meta_title: "",
  meta_description: "",
  is_featured: false,
  category: null,
};

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

export default function PostForm({
  initialValues = defaultValues,
  onSubmit,
  submitLabel,
  clubId,
  clubSlug,
}: Props) {
  const [values, setValues] = useState<PostFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setSlugTouched(!!initialValues.slug);
  }, [initialValues]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getPostCategories(clubSlug);
        setCategories(data);
      } catch (e) {
        console.error("Načítanie kategórií zlyhalo", e);
      }
    };

    if (clubSlug) {
      loadCategories();
    }
  }, [clubSlug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    setValues((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? target.checked : value,
      };

      if (name === "title" && !slugTouched) {
        next.slug = slugifyText(value);
      }

      return next;
    });

    if (name === "slug") {
      setSlugTouched(true);
    }
  };

  const handleContentChange = (html: string) => {
    setValues((prev) => ({
      ...prev,
      content: html,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    setValues((prev) => ({
      ...prev,
      category: value ? Number(value) : null,
    }));
  };

  const handleFeaturedUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFeatured(true);
      const result = await uploadFeaturedImage(clubId, file);

      setValues((prev) => ({
        ...prev,
        featured_image: result.url,
        featured_image_path: result.path,
      }));
    } catch (err) {
      console.error("Upload featured image zlyhal", err);
      alert("Upload hlavného obrázka zlyhal.");
    } finally {
      setUploadingFeatured(false);
    }
  };

  const handleRemoveFeatured = () => {
    setValues((prev) => ({
      ...prev,
      featured_image: null,
      featured_image_path: null,
    }));
  };

  const previewTitle = useMemo(
    () => values.title || "Nadpis článku",
    [values.title]
  );

  const previewExcerpt = useMemo(
    () => values.excerpt || "Krátky popis článku sa zobrazí tu.",
    [values.excerpt]
  );

  const statusLabel = useMemo(() => {
    switch (values.status) {
      case "published":
        return "Publikované";
      case "scheduled":
        return "Naplánované";
      case "archived":
        return "Archivované";
      default:
        return "Draft";
    }
  }, [values.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch {
      setError("Uloženie článku sa nepodarilo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.mainColumn}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Základné informácie</h2>
              <p className={styles.cardDescription}>
                Nadpis, slug a krátky úvodný text článku.
              </p>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Názov článku</label>
            <input
              className={styles.input}
              name="title"
              value={values.title}
              onChange={handleChange}
              placeholder="Napr. Víťazstvo ATU Košice v derby"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Slug</label>
            <input
              className={styles.input}
              name="slug"
              value={values.slug}
              onChange={handleChange}
              placeholder="vitazstvo-atu-kosice-v-derby"
            />
            <p className={styles.hint}>URL adresa článku na webe.</p>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Krátky popis</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              name="excerpt"
              value={values.excerpt}
              onChange={handleChange}
              placeholder="Krátky úvodný text, ktorý sa zobrazí v zozname článkov."
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Obsah článku</h2>
              <p className={styles.cardDescription}>
                Tu tvoríš hlavný obsah článku.
              </p>
            </div>
          </div>

          <div className={styles.editorWrap}>
            <RichTextEditor
              value={values.content}
              onChange={handleContentChange}
              clubId={clubId}
            />
          </div>
        </section>
      </div>

      <aside className={styles.sideColumn}>
        <section className={styles.card}>
          <div className={styles.sideTopRow}>
            <div>
              <h3 className={styles.cardTitleSmall}>Publikovanie</h3>
              <p className={styles.cardDescriptionSmall}>
                Nastavenia zverejnenia a kategórie.
              </p>
            </div>

            <span
              className={`${styles.statusBadge} ${
                values.status === "published"
                  ? styles.statusPublished
                  : values.status === "scheduled"
                  ? styles.statusScheduled
                  : values.status === "archived"
                  ? styles.statusArchived
                  : styles.statusDraft
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.input}
              name="status"
              value={values.status}
              onChange={handleChange}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Kategória</label>
            <select
              className={styles.input}
              value={values.category ?? ""}
              onChange={handleCategoryChange}
            >
              <option value="">Bez kategórie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="is_featured"
              checked={values.is_featured}
              onChange={handleChange}
            />
            <span>Featured článok</span>
          </label>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitleSmall}>Hlavný obrázok</h3>
              <p className={styles.cardDescriptionSmall}>
                Vyber titulný obrázok článku.
              </p>
            </div>
          </div>

          <div className={styles.uploadActions}>
            <label className={styles.uploadButton}>
              {uploadingFeatured ? "Nahrávam..." : "Vybrať obrázok"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFeaturedUpload}
                className={styles.hiddenInput}
              />
            </label>

            {values.featured_image && (
              <button
                type="button"
                onClick={handleRemoveFeatured}
                className={styles.secondaryButton}
              >
                Odstrániť
              </button>
            )}
          </div>

          {values.featured_image ? (
            <img
              src={values.featured_image}
              alt="Featured"
              className={styles.featuredImage}
            />
          ) : (
            <div className={styles.emptyImageBox}>Zatiaľ nie je vybraný obrázok</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitleSmall}>SEO</h3>
              <p className={styles.cardDescriptionSmall}>
                Nastavenia pre Google a zdieľanie.
              </p>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Meta title</label>
            <input
              className={styles.input}
              name="meta_title"
              value={values.meta_title}
              onChange={handleChange}
              placeholder="Titulok pre Google"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Meta description</label>
            <textarea
              className={`${styles.input} ${styles.textareaSmall}`}
              name="meta_description"
              value={values.meta_description}
              onChange={handleChange}
              placeholder="Krátky popis pre Google"
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitleSmall}>Náhľad</h3>
              <p className={styles.cardDescriptionSmall}>
                Rýchly vizuálny náhľad článku.
              </p>
            </div>
          </div>

          {values.featured_image && (
            <img
              src={values.featured_image}
              alt="Preview"
              className={styles.previewImage}
            />
          )}

          <h2 className={styles.previewTitle}>{previewTitle}</h2>
          <p className={styles.previewExcerpt}>{previewExcerpt}</p>

          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{
              __html: values.content || "<p>Obsah článku...</p>",
            }}
          />
        </section>

        <section className={styles.card}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? "Ukladám..." : submitLabel}
          </button>
        </section>
      </aside>
    </form>
  );
}