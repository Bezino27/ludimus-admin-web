import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  createClubDocument,
  createClubLink,
  deleteClubDocument,
  deleteClubLink,
  getClubInfoOverview,
  saveContactInfo,
  updateClubDocument,
  updateClubLink,
} from "../../api/clubInfo";
import type {
  ClubDocument,
  ClubInfoOverview,
  ClubLink,
  ContactInfoPayload,
} from "../../types/clubInfo";
import styles from "./ClubInfoPage.module.css";

type ActiveTab = "contact" | "documents" | "links";

const emptyContactForm: ContactInfoPayload = {
  address: "",
  chairman_name: "",
  email: "",
  phone: "",
  iban: "",
  map_label: "",
  map_address: "",
  latitude: "0",
  longitude: "0",
  note: "",
  is_active: true,
};

export default function ClubInfoPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("contact");
  const [overview, setOverview] = useState<ClubInfoOverview | null>(null);
  const [contactForm, setContactForm] = useState<ContactInfoPayload>(emptyContactForm);

  const [documentForm, setDocumentForm] = useState({
    id: null as number | null,
    title: "",
    order: 0,
    is_active: true,
    file: null as File | null,
  });

  const [linkForm, setLinkForm] = useState({
    id: null as number | null,
    title: "",
    url: "",
    icon_type: "",
    order: 0,
    is_active: true,
    logo: null as File | null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeTitle = useMemo(() => {
    if (activeTab === "contact") return "Kontaktné informácie";
    if (activeTab === "documents") return "Klubové dokumenty";
    return "Klubové odkazy";
  }, [activeTab]);

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await getClubInfoOverview();
      setOverview(data);

      if (data.contact) {
        setContactForm({
          address: data.contact.address || "",
          chairman_name: data.contact.chairman_name || "",
          email: data.contact.email || "",
          phone: data.contact.phone || "",
          iban: data.contact.iban || "",
          map_label: data.contact.map_label || "",
          map_address: data.contact.map_address || "",
          latitude: String(data.contact.latitude ?? "0"),
          longitude: String(data.contact.longitude ?? "0"),
          note: data.contact.note || "",
          is_active: data.contact.is_active,
        });
      }
    } catch {
      setErrorMessage("Nepodarilo sa načítať klubové informácie.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSaveContact(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      await saveContactInfo(contactForm);
      await loadData();
    } catch {
      setErrorMessage("Nepodarilo sa uložiť kontaktné informácie.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveDocument(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      if (documentForm.id) {
        await updateClubDocument(documentForm.id, documentForm);
      } else {
        await createClubDocument(documentForm);
      }

      resetDocumentForm();
      await loadData();
    } catch {
      setErrorMessage("Nepodarilo sa uložiť dokument.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDocument(id: number) {
    if (!window.confirm("Naozaj chceš zmazať tento dokument?")) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      await deleteClubDocument(id);
      await loadData();
    } catch {
      setErrorMessage("Nepodarilo sa zmazať dokument.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditDocument(document: ClubDocument) {
    setDocumentForm({
      id: document.id,
      title: document.title,
      order: document.order,
      is_active: document.is_active,
      file: null,
    });
  }

  function resetDocumentForm() {
    setDocumentForm({
      id: null,
      title: "",
      order: 0,
      is_active: true,
      file: null,
    });
  }

  async function handleSaveLink(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      if (linkForm.id) {
        await updateClubLink(linkForm.id, linkForm);
      } else {
        await createClubLink(linkForm);
      }

      resetLinkForm();
      await loadData();
    } catch {
      setErrorMessage("Nepodarilo sa uložiť odkaz.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLink(id: number) {
    if (!window.confirm("Naozaj chceš zmazať tento odkaz?")) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      await deleteClubLink(id);
      await loadData();
    } catch {
      setErrorMessage("Nepodarilo sa zmazať odkaz.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditLink(link: ClubLink) {
    setLinkForm({
      id: link.id,
      title: link.title,
      url: link.url,
      icon_type: link.icon_type || "",
      order: link.order,
      is_active: link.is_active,
      logo: null,
    });
  }

  function resetLinkForm() {
    setLinkForm({
      id: null,
      title: "",
      url: "",
      icon_type: "",
      order: 0,
      is_active: true,
      logo: null,
    });
  }

  if (isLoading) {
    return <div className={styles.page}>Načítavam klubové informácie...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin web</p>
          <h1>Klubové informácie</h1>
          <p className={styles.subtitle}>
            Správa kontaktu, dokumentov a odkazov pre klub{" "}
            <strong>{overview?.club.name || "klub"}</strong>.
          </p>
        </div>

        <button className={styles.secondaryButton} type="button" onClick={() => void loadData()}>
          Obnoviť
        </button>
      </div>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === "contact" ? styles.tabButtonActive : ""}`}
          type="button"
          onClick={() => setActiveTab("contact")}
        >
          Kontaktné informácie
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "documents" ? styles.tabButtonActive : ""}`}
          type="button"
          onClick={() => setActiveTab("documents")}
        >
          Klubové dokumenty
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "links" ? styles.tabButtonActive : ""}`}
          type="button"
          onClick={() => setActiveTab("links")}
        >
          Klubové odkazy
        </button>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.cardEyebrow}>Aktívna sekcia</p>
            <h2>{activeTitle}</h2>
          </div>
        </div>

        {activeTab === "contact" ? (
          <form className={styles.formGrid} onSubmit={handleSaveContact}>
            <Field label="Adresa">
              <input
                value={contactForm.address}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, address: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="Predseda / kontaktná osoba">
              <input
                value={contactForm.chairman_name}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, chairman_name: event.target.value }))
                }
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={contactForm.email}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="Telefón">
              <input
                value={contactForm.phone}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="IBAN">
              <input
                value={contactForm.iban}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, iban: event.target.value }))
                }
              />
            </Field>

            <Field label="Názov mapy">
              <input
                value={contactForm.map_label}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, map_label: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="Adresa mapy">
              <input
                value={contactForm.map_address}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, map_address: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="Latitude">
              <input
                value={contactForm.latitude}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, latitude: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="Longitude">
              <input
                value={contactForm.longitude}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, longitude: event.target.value }))
                }
                required
              />
            </Field>

            <Field label="Poznámka" fullWidth>
              <textarea
                value={contactForm.note}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, note: event.target.value }))
                }
                rows={4}
              />
            </Field>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={contactForm.is_active}
                onChange={(event) =>
                  setContactForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              Aktívne
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={isSaving}>
                {isSaving ? "Ukladám..." : "Uložiť kontakt"}
              </button>
            </div>
          </form>
        ) : null}

        {activeTab === "documents" ? (
          <div className={styles.twoColumn}>
            <form className={styles.sideForm} onSubmit={handleSaveDocument}>
              <h3>{documentForm.id ? "Upraviť dokument" : "Pridať dokument"}</h3>

              <Field label="Názov">
                <input
                  value={documentForm.title}
                  onChange={(event) =>
                    setDocumentForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field label="Poradie">
                <input
                  type="number"
                  value={documentForm.order}
                  onChange={(event) =>
                    setDocumentForm((prev) => ({ ...prev, order: Number(event.target.value) }))
                  }
                />
              </Field>

              <Field label="Súbor">
                <input
                  type="file"
                  onChange={(event) =>
                    setDocumentForm((prev) => ({
                      ...prev,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                  required={!documentForm.id}
                />
              </Field>

              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  checked={documentForm.is_active}
                  onChange={(event) =>
                    setDocumentForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                Aktívne
              </label>

              <div className={styles.formActions}>
                {documentForm.id ? (
                  <button className={styles.secondaryButton} type="button" onClick={resetDocumentForm}>
                    Zrušiť
                  </button>
                ) : null}
                <button className={styles.primaryButton} type="submit" disabled={isSaving}>
                  {documentForm.id ? "Uložiť zmeny" : "Pridať dokument"}
                </button>
              </div>
            </form>

            <DataList
              emptyText="Zatiaľ nie sú pridané žiadne dokumenty."
              items={overview?.documents || []}
              renderItem={(document) => (
                <div className={styles.listItem} key={document.id}>
                  <div>
                    <strong>{document.title}</strong>
                    <span>
                      Poradie: {document.order} · {document.is_active ? "Aktívny" : "Neaktívny"}
                    </span>
                    {document.file_url ? (
                      <a href={document.file_url} target="_blank" rel="noreferrer">
                        Otvoriť súbor
                      </a>
                    ) : null}
                  </div>

                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => handleEditDocument(document)}>
                      Upraviť
                    </button>
                    <button type="button" onClick={() => void handleDeleteDocument(document.id)}>
                      Zmazať
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : null}

        {activeTab === "links" ? (
          <div className={styles.twoColumn}>
            <form className={styles.sideForm} onSubmit={handleSaveLink}>
              <h3>{linkForm.id ? "Upraviť odkaz" : "Pridať odkaz"}</h3>

              <Field label="Názov">
                <input
                  value={linkForm.title}
                  onChange={(event) =>
                    setLinkForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field label="URL">
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(event) =>
                    setLinkForm((prev) => ({ ...prev, url: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field label="Typ ikonky">
                <input
                  value={linkForm.icon_type}
                  placeholder="Nechaj prázdne pre automatiku"
                  onChange={(event) =>
                    setLinkForm((prev) => ({ ...prev, icon_type: event.target.value }))
                  }
                />
              </Field>

              <Field label="Poradie">
                <input
                  type="number"
                  value={linkForm.order}
                  onChange={(event) =>
                    setLinkForm((prev) => ({ ...prev, order: Number(event.target.value) }))
                  }
                />
              </Field>

              <Field label="Logo">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setLinkForm((prev) => ({
                      ...prev,
                      logo: event.target.files?.[0] || null,
                    }))
                  }
                />
              </Field>

              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  checked={linkForm.is_active}
                  onChange={(event) =>
                    setLinkForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                Aktívne
              </label>

              <div className={styles.formActions}>
                {linkForm.id ? (
                  <button className={styles.secondaryButton} type="button" onClick={resetLinkForm}>
                    Zrušiť
                  </button>
                ) : null}
                <button className={styles.primaryButton} type="submit" disabled={isSaving}>
                  {linkForm.id ? "Uložiť zmeny" : "Pridať odkaz"}
                </button>
              </div>
            </form>

            <DataList
              emptyText="Zatiaľ nie sú pridané žiadne odkazy."
              items={overview?.links || []}
              renderItem={(link) => (
                <div className={styles.listItem} key={link.id}>
                  <div>
                    <strong>{link.title}</strong>
                    <span>
                      {link.icon_type || "automaticky"} · Poradie: {link.order} ·{" "}
                      {link.is_active ? "Aktívny" : "Neaktívny"}
                    </span>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.url}
                    </a>
                    {link.logo_url ? (
                      <img className={styles.logoPreview} src={link.logo_url} alt={link.title} />
                    ) : null}
                  </div>

                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => handleEditLink(link)}>
                      Upraviť
                    </button>
                    <button type="button" onClick={() => void handleDeleteLink(link.id)}>
                      Zmazať
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  fullWidth = false,
}: {
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <label className={`${styles.field} ${fullWidth ? styles.fieldFull : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function DataList<T>({
  items,
  emptyText,
  renderItem,
}: {
  items: T[];
  emptyText: string;
  renderItem: (item: T) => ReactNode;
}) {
  if (!items.length) {
    return <div className={styles.emptyState}>{emptyText}</div>;
  }

  return <div className={styles.list}>{items.map(renderItem)}</div>;
}
