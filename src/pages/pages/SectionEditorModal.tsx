import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import {
  createPageSectionContactItem,
  createPageSectionItem,
  deletePageSectionContactItem,
  deletePageSectionItem,
  getPageSectionContactItems,
  getPageSectionItems,
  updatePageSection,
  updatePageSectionContactItem,
  updatePageSectionItem,
} from "../../api/pages";
import type {
  AdminPageSection,
  AdminPageSectionContactItem,
  AdminPageSectionItem,
  CreatePageSectionPayload,
  SectionOption,
} from "../../types/page";
import styles from "./PagesAdmin.module.css";
import SectionRichTextEditor from "./SectionRichTextEditor";

const CONTACT_TYPE_OPTIONS = [
  ["phone", "Telefón"],
  ["email", "Email"],
  ["iban", "IBAN"],
  ["address", "Adresa"],
  ["person", "Osoba / kontaktná osoba"],
  ["web", "Web / URL"],
  ["text", "Text / poznámka"],
] as const;

type SectionEditorModalProps = {
  mode: "create" | "edit";
  pageId: number;
  section: AdminPageSection | null;
  sectionOptions: SectionOption[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
  onCreateSection: (payload: CreatePageSectionPayload) => Promise<void>;
};

type BasicForm = {
  section_type: string;
  pre_title: string;
  title: string;
  content: string;
  image: File | null;
  is_active: boolean;
  hide_when_empty: boolean;
};

type NewSectionItemForm = {
  title: string;
  url: string;
  file: File | null;
  is_active: boolean;
};

type ItemDraft = {
  title: string;
  url: string;
  file: File | null;
  order: number;
  is_active: boolean;
};

type NewContactForm = {
  contact_type: string;
  value: string;
  url: string;
  is_active: boolean;
};

type ContactDraft = {
  contact_type: string;
  value: string;
  url: string;
  order: number;
  is_active: boolean;
};

type ApiErrorResponse = {
  detail?: string;
  [key: string]: unknown;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const data = axiosError.response?.data;

  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;

  return JSON.stringify(data, null, 2);
}

function isCustomTextType(sectionType: string) {
  return sectionType === "custom_text" || sectionType === "about_text";
}

function isHeroType(sectionType: string) {
  return sectionType === "hero";
}

function isItemsType(sectionType: string) {
  return sectionType === "custom_documents" || sectionType === "custom_links";
}

function isContactType(sectionType: string) {
  return sectionType === "contact";
}

function getSectionItemLabel(sectionType: string) {
  if (sectionType === "custom_documents") return "dokument";
  if (sectionType === "custom_links") return "odkaz";
  return "položka";
}

function getSectionItemsTitle(sectionType: string) {
  if (sectionType === "custom_documents") return "Vlastné dokumenty";
  if (sectionType === "custom_links") return "Vlastné odkazy";
  return "Položky sekcie";
}

function getContactTypeLabel(value: string) {
  return CONTACT_TYPE_OPTIONS.find(([key]) => key === value)?.[1] ?? value;
}

export default function SectionEditorModal({
  mode,
  pageId,
  section,
  sectionOptions,
  onClose,
  onSaved,
  onCreateSection,
}: SectionEditorModalProps) {
  const [basicForm, setBasicForm] = useState<BasicForm>({
    section_type: section?.section_type ?? sectionOptions[0]?.value ?? "",
    pre_title: section?.pre_title ?? "",
    title: section?.title ?? "",
    content: section?.content ?? "",
    image: null,
    is_active: section?.is_active ?? true,
    hide_when_empty: section?.hide_when_empty ?? false,
  });

  const [items, setItems] = useState<AdminPageSectionItem[]>([]);
  const [itemDrafts, setItemDrafts] = useState<Record<number, ItemDraft>>({});
  const [newItemForm, setNewItemForm] = useState<NewSectionItemForm>({
    title: "",
    url: "",
    file: null,
    is_active: true,
  });

  const [contactItems, setContactItems] = useState<AdminPageSectionContactItem[]>([]);
  const [contactDrafts, setContactDrafts] = useState<Record<number, ContactDraft>>({});
  const [newContactForm, setNewContactForm] = useState<NewContactForm>({
    contact_type: "text",
    value: "",
    url: "",
    is_active: true,
  });

  const [loadingExtra, setLoadingExtra] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const activeSectionType = basicForm.section_type;
  const isEditMode = mode === "edit" && Boolean(section);

  const selectedImagePreview = useMemo(() => {
    if (!basicForm.image) return null;
    return URL.createObjectURL(basicForm.image);
  }, [basicForm.image]);

  useEffect(() => {
    setBasicForm({
      section_type: section?.section_type ?? sectionOptions[0]?.value ?? "",
      pre_title: section?.pre_title ?? "",
      title: section?.title ?? "",
      content: section?.content ?? "",
      image: null,
      is_active: section?.is_active ?? true,
      hide_when_empty: section?.hide_when_empty ?? false,
    });
  }, [section, sectionOptions, mode]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    };
  }, [selectedImagePreview]);

  const loadSectionItems = async () => {
    if (!section || !isItemsType(section.section_type)) return;

    try {
      setLoadingExtra(true);
      const data = await getPageSectionItems(section.id);
      setItems(data);
      setItemDrafts(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            {
              title: item.title,
              url: item.url,
              file: null,
              order: item.order,
              is_active: item.is_active,
            },
          ])
        )
      );
    } catch (err) {
      console.error("Načítanie položiek sekcie zlyhalo", err);
      setError(getErrorMessage(err, "Nepodarilo sa načítať položky sekcie."));
    } finally {
      setLoadingExtra(false);
    }
  };

  const loadContactItems = async () => {
    if (!section || section.section_type !== "contact") return;

    try {
      setLoadingExtra(true);
      const data = await getPageSectionContactItems(section.id);
      setContactItems(data);
      setContactDrafts(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            {
              contact_type: item.contact_type,
              value: item.value,
              url: item.url,
              order: item.order,
              is_active: item.is_active,
            },
          ])
        )
      );
    } catch (err) {
      console.error("Načítanie kontaktných položiek zlyhalo", err);
      setError(getErrorMessage(err, "Nepodarilo sa načítať kontaktné položky."));
    } finally {
      setLoadingExtra(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setItemDrafts({});
    setContactItems([]);
    setContactDrafts({});
    setError("");

    loadSectionItems();
    loadContactItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  const handleBasicChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = event.target as HTMLInputElement;
    const { name, value, type } = target;

    setBasicForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setBasicForm((prev) => ({ ...prev, image: file }));
  };

  const handleSaveBasicSection = async () => {
    if (!basicForm.section_type) {
      setError("Vyber typ sekcie.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (mode === "create") {
        await onCreateSection({
          page: pageId,
          section_type: basicForm.section_type,
          pre_title: basicForm.pre_title,
          title: basicForm.title,
          order: 0,
          is_active: basicForm.is_active,
          hide_when_empty: basicForm.hide_when_empty,
        });
        await onSaved("Sekcia bola pridaná.");
        return;
      }

      if (!section) return;

      await updatePageSection(section.id, {
        section_type: basicForm.section_type,
        pre_title: basicForm.pre_title,
        title: basicForm.title,
        content: basicForm.content,
        image: basicForm.image,
        is_active: basicForm.is_active,
        hide_when_empty: basicForm.hide_when_empty,
      });

      await onSaved("Sekcia bola uložená.");
    } catch (err) {
      console.error("Uloženie sekcie zlyhalo", err);
      setError(getErrorMessage(err, "Sekciu sa nepodarilo uložiť."));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItem = async () => {
    if (!section) return;

    try {
      setSaving(true);
      setError("");

      const maxOrder = items.reduce((max, item) => Math.max(max, item.order), 0);

      await createPageSectionItem({
        section: section.id,
        title: newItemForm.title,
        url: newItemForm.url,
        file: newItemForm.file,
        order: maxOrder + 1,
        is_active: newItemForm.is_active,
      });

      setNewItemForm({ title: "", url: "", file: null, is_active: true });
      await loadSectionItems();
      await onSaved(`${getSectionItemLabel(section.section_type)} bol pridaný.`);
    } catch (err) {
      console.error("Pridanie položky zlyhalo", err);
      setError(getErrorMessage(err, "Položku sa nepodarilo pridať."));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (item: AdminPageSectionItem) => {
    const draft = itemDrafts[item.id];
    if (!draft) return;

    try {
      setSavingItemId(item.id);
      setError("");

      await updatePageSectionItem(item.id, {
        title: draft.title,
        url: draft.url,
        file: draft.file,
        order: draft.order,
        is_active: draft.is_active,
      });

      await loadSectionItems();
      await onSaved("Položka bola uložená.");
    } catch (err) {
      console.error("Uloženie položky zlyhalo", err);
      setError(getErrorMessage(err, "Položku sa nepodarilo uložiť."));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleDeleteItem = async (item: AdminPageSectionItem) => {
    if (!window.confirm(`Naozaj chceš odstrániť "${item.title}"?`)) return;

    try {
      setDeletingItemId(item.id);
      setError("");

      await deletePageSectionItem(item.id);
      await loadSectionItems();
      await onSaved("Položka bola odstránená.");
    } catch (err) {
      console.error("Odstránenie položky zlyhalo", err);
      setError(getErrorMessage(err, "Položku sa nepodarilo odstrániť."));
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleCreateContactItem = async () => {
    if (!section) return;

    try {
      setSaving(true);
      setError("");

      const maxOrder = contactItems.reduce((max, item) => Math.max(max, item.order), 0);

      await createPageSectionContactItem({
        section: section.id,
        contact_type: newContactForm.contact_type,
        value: newContactForm.value,
        url: newContactForm.url,
        order: maxOrder + 1,
        is_active: newContactForm.is_active,
      });

      setNewContactForm({ contact_type: "text", value: "", url: "", is_active: true });
      await loadContactItems();
      await onSaved("Kontaktná položka bola pridaná.");
    } catch (err) {
      console.error("Pridanie kontaktnej položky zlyhalo", err);
      setError(getErrorMessage(err, "Kontaktnú položku sa nepodarilo pridať."));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContactItem = async (item: AdminPageSectionContactItem) => {
    const draft = contactDrafts[item.id];
    if (!draft) return;

    try {
      setSavingItemId(item.id);
      setError("");

      await updatePageSectionContactItem(item.id, {
        contact_type: draft.contact_type,
        value: draft.value,
        url: draft.url,
        order: draft.order,
        is_active: draft.is_active,
      });

      await loadContactItems();
      await onSaved("Kontaktná položka bola uložená.");
    } catch (err) {
      console.error("Uloženie kontaktnej položky zlyhalo", err);
      setError(getErrorMessage(err, "Kontaktnú položku sa nepodarilo uložiť."));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleDeleteContactItem = async (item: AdminPageSectionContactItem) => {
    if (!window.confirm(`Naozaj chceš odstrániť "${getContactTypeLabel(item.contact_type)}"?`)) {
      return;
    }

    try {
      setDeletingItemId(item.id);
      setError("");

      await deletePageSectionContactItem(item.id);
      await loadContactItems();
      await onSaved("Kontaktná položka bola odstránená.");
    } catch (err) {
      console.error("Odstránenie kontaktnej položky zlyhalo", err);
      setError(getErrorMessage(err, "Kontaktnú položku sa nepodarilo odstrániť."));
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <div
        className={styles.sectionModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-modal-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="section-modal-title" className={styles.modalTitle}>
              {mode === "create" ? "Pridať sekciu" : "Upraviť sekciu"}
            </h2>
            <p className={styles.modalText}>
              Uprav základné údaje sekcie a podľa typu aj jej obsah.
            </p>
          </div>
          <button
            type="button"
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Zavrieť"
            disabled={saving}
          >
            ×
          </button>
        </div>

        {error ? <div className={`${styles.stateCard} ${styles.errorCard}`}>{error}</div> : null}

        <div className={styles.sectionForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Typ sekcie</label>
            <select
              className={styles.input}
              name="section_type"
              value={basicForm.section_type}
              onChange={handleBasicChange}
            >
              {sectionOptions.length === 0 ? (
                <option value="">Nie sú dostupné typy sekcií</option>
              ) : (
                sectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Prednadpis</label>
            <input
              className={styles.input}
              name="pre_title"
              value={basicForm.pre_title}
              onChange={handleBasicChange}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nadpis</label>
            <input
              className={styles.input}
              name="title"
              value={basicForm.title}
              onChange={handleBasicChange}
            />
          </div>

          <div className={styles.checkboxGrid}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="is_active"
                checked={basicForm.is_active}
                onChange={handleBasicChange}
              />
              Aktívna
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="hide_when_empty"
                checked={basicForm.hide_when_empty}
                onChange={handleBasicChange}
              />
              Skryť, keď je prázdna
            </label>
          </div>

          {mode === "edit" && isHeroType(activeSectionType) ? (
            <div className={styles.editorBlock}>
              <h3 className={styles.editorBlockTitle}>Hero obrázok</h3>
              {section?.image_url || selectedImagePreview ? (
                <img
                  src={selectedImagePreview || section?.image_url || ""}
                  alt="Hero obrázok"
                  className={styles.editorImagePreview}
                />
              ) : null}
              <input type="file" accept="image/*" onChange={handleImageChange} />
              <p className={styles.hintText}>Obrázok sa použije ako banner/hero obrázok sekcie.</p>
            </div>
          ) : null}

          {mode === "edit" && isCustomTextType(activeSectionType) ? (
            <div className={styles.editorBlock}>
              <h3 className={styles.editorBlockTitle}>Obsah sekcie</h3>

              <SectionRichTextEditor
                value={basicForm.content}
                onChange={(content) =>
                  setBasicForm((prev) => ({ ...prev, content }))
                }
              />
            </div>
          ) : null}

          {isEditMode && isItemsType(activeSectionType) ? (
            <div className={styles.editorBlock}>
              <h3 className={styles.editorBlockTitle}>{getSectionItemsTitle(activeSectionType)}</h3>

              {loadingExtra ? <div className={styles.stateCard}>Načítavam položky...</div> : null}

              <div className={styles.itemList}>
                {items.map((item) => {
                  const draft = itemDrafts[item.id];
                  if (!draft) return null;

                  return (
                    <div key={item.id} className={styles.itemEditorRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Názov</label>
                        <input
                          className={styles.input}
                          value={draft.title}
                          onChange={(event) =>
                            setItemDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, title: event.target.value },
                            }))
                          }
                        />
                      </div>

                      {activeSectionType === "custom_links" ? (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>URL</label>
                          <input
                            className={styles.input}
                            value={draft.url}
                            onChange={(event) =>
                              setItemDrafts((prev) => ({
                                ...prev,
                                [item.id]: { ...draft, url: event.target.value },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>Súbor</label>
                          {item.file_url ? (
                            <a href={item.file_url} target="_blank" rel="noreferrer">Otvoriť aktuálny súbor</a>
                          ) : null}
                          <input
                            type="file"
                            onChange={(event) =>
                              setItemDrafts((prev) => ({
                                ...prev,
                                [item.id]: { ...draft, file: event.target.files?.[0] ?? null },
                              }))
                            }
                          />
                        </div>
                      )}

                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) =>
                            setItemDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, is_active: event.target.checked },
                            }))
                          }
                        />
                        Aktívna
                      </label>

                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => handleUpdateItem(item)}
                          disabled={savingItemId === item.id}
                        >
                          {savingItemId === item.id ? "Ukladám..." : "Uložiť"}
                        </button>
                        <button
                          type="button"
                          className={styles.dangerActionButton}
                          onClick={() => handleDeleteItem(item)}
                          disabled={deletingItemId === item.id}
                        >
                          {deletingItemId === item.id ? "Mažem..." : "Odstrániť"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.newItemBox}>
                <h4 className={styles.newItemTitle}>+ Pridať {getSectionItemLabel(activeSectionType)}</h4>

                <div className={styles.formGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Názov</label>
                    <input
                      className={styles.input}
                      value={newItemForm.title}
                      onChange={(event) => setNewItemForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </div>

                  {activeSectionType === "custom_links" ? (
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>URL</label>
                      <input
                        className={styles.input}
                        value={newItemForm.url}
                        onChange={(event) => setNewItemForm((prev) => ({ ...prev, url: event.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Súbor</label>
                      <input
                        type="file"
                        onChange={(event) => setNewItemForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
                      />
                    </div>
                  )}
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={newItemForm.is_active}
                    onChange={(event) => setNewItemForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Aktívna
                </label>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleCreateItem}
                  disabled={saving || !newItemForm.title}
                >
                  Pridať
                </button>
              </div>
            </div>
          ) : null}

          {isEditMode && isContactType(activeSectionType) ? (
            <div className={styles.editorBlock}>
              <h3 className={styles.editorBlockTitle}>Kontaktné položky</h3>

              {loadingExtra ? <div className={styles.stateCard}>Načítavam kontakty...</div> : null}

              <div className={styles.itemList}>
                {contactItems.map((item) => {
                  const draft = contactDrafts[item.id];
                  if (!draft) return null;

                  return (
                    <div key={item.id} className={styles.itemEditorRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Typ</label>
                        <select
                          className={styles.input}
                          value={draft.contact_type}
                          onChange={(event) =>
                            setContactDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, contact_type: event.target.value },
                            }))
                          }
                        >
                          {CONTACT_TYPE_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Hodnota</label>
                        <textarea
                          className={styles.textarea}
                          value={draft.value}
                          onChange={(event) =>
                            setContactDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, value: event.target.value },
                            }))
                          }
                        />
                      </div>

                      {draft.contact_type === "web" ? (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>URL</label>
                          <input
                            className={styles.input}
                            value={draft.url}
                            onChange={(event) =>
                              setContactDrafts((prev) => ({
                                ...prev,
                                [item.id]: { ...draft, url: event.target.value },
                              }))
                            }
                          />
                        </div>
                      ) : null}

                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) =>
                            setContactDrafts((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, is_active: event.target.checked },
                            }))
                          }
                        />
                        Aktívna
                      </label>

                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => handleUpdateContactItem(item)}
                          disabled={savingItemId === item.id}
                        >
                          {savingItemId === item.id ? "Ukladám..." : "Uložiť"}
                        </button>
                        <button
                          type="button"
                          className={styles.dangerActionButton}
                          onClick={() => handleDeleteContactItem(item)}
                          disabled={deletingItemId === item.id}
                        >
                          {deletingItemId === item.id ? "Mažem..." : "Odstrániť"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.newItemBox}>
                <h4 className={styles.newItemTitle}>+ Pridať kontakt</h4>

                <div className={styles.formGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Typ</label>
                    <select
                      className={styles.input}
                      value={newContactForm.contact_type}
                      onChange={(event) =>
                        setNewContactForm((prev) => ({ ...prev, contact_type: event.target.value }))
                      }
                    >
                      {CONTACT_TYPE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Hodnota</label>
                    <textarea
                      className={styles.textarea}
                      value={newContactForm.value}
                      onChange={(event) => setNewContactForm((prev) => ({ ...prev, value: event.target.value }))}
                    />
                  </div>

                  {newContactForm.contact_type === "web" ? (
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>URL</label>
                      <input
                        className={styles.input}
                        value={newContactForm.url}
                        onChange={(event) => setNewContactForm((prev) => ({ ...prev, url: event.target.value }))}
                      />
                    </div>
                  ) : null}
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={newContactForm.is_active}
                    onChange={(event) => setNewContactForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Aktívna
                </label>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleCreateContactItem}
                  disabled={saving || (!newContactForm.value && !newContactForm.url)}
                >
                  Pridať kontakt
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
            Zrušiť
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSaveBasicSection}
            disabled={saving || !basicForm.section_type}
          >
            {saving ? "Ukladám..." : mode === "create" ? "Pridať sekciu" : "Uložiť sekciu"}
          </button>
        </div>
      </div>
    </div>
  );
}
