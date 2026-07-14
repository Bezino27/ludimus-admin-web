import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createCategoryLink,
  createCategoryTraining,
  createTrainingLocation,
  deleteCategoryLink,
  deleteCategoryTraining,
  deleteTrainingLocation,
  getCategoryLinks,
  getCategoryTrainings,
  getTrainingLocations,
  updateCategoryLink,
  updateCategoryTraining,
  updateTrainingLocation,
} from "../../api/pages";
import type {
  AdminCategoryLink,
  AdminCategoryTraining,
  AdminTrainingLocation,
} from "../../types/page";
import styles from "./CategoriesPage.module.css";

type Props = {
  categoryId: number;
  clubId: number;
  clubSlug: string;
};

const weekdays = [
  [1, "Pondelok"], [2, "Utorok"], [3, "Streda"], [4, "Štvrtok"],
  [5, "Piatok"], [6, "Sobota"], [7, "Nedeľa"],
] as const;

const emptyLocation = {
  id: null as number | null,
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  order: 0,
  is_active: true,
};

const emptyTraining = {
  id: null as number | null,
  location: "",
  weekday: 1,
  start_time: "15:00",
  order: 0,
  is_active: true,
};

const emptyLink = {
  id: null as number | null,
  title: "",
  description: "",
  cta_text: "Otvoriť odkaz",
  url: "",
  order: 0,
  is_active: true,
};

const defaultCategoryLinks = [
  {
    title: "Detail tímu",
    description: "Profil tímu, hráči, tréneri a ďalšie informácie.",
    cta_text: "Otvoriť detail tímu",
  },
  {
    title: "Tabuľka",
    description: "Aktuálne poradie tímov v ligovej tabuľke.",
    cta_text: "Zobraziť tabuľku",
  },
  {
    title: "Výsledky a program",
    description: "Výsledky zápasov a program najbližších stretnutí.",
    cta_text: "Pozrieť výsledky a program",
  },
];

function normalizeTitle(value: string) {
  return value.trim().toLocaleLowerCase("sk");
}

export default function CategoryExtrasEditor({ categoryId, clubId, clubSlug }: Props) {
  const [locations, setLocations] = useState<AdminTrainingLocation[]>([]);
  const [trainings, setTrainings] = useState<AdminCategoryTraining[]>([]);
  const [links, setLinks] = useState<AdminCategoryLink[]>([]);
  const [locationForm, setLocationForm] = useState(emptyLocation);
  const [trainingForm, setTrainingForm] = useState(emptyTraining);
  const [linkForm, setLinkForm] = useState(emptyLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadExtras = useCallback(async () => {
    setError("");
    try {
      const [locationData, trainingData, linkData] = await Promise.all([
        getTrainingLocations(clubSlug),
        getCategoryTrainings(categoryId),
        getCategoryLinks(categoryId),
      ]);
      setLocations(locationData.sort((a, b) => a.order - b.order));
      setTrainings(trainingData.sort((a, b) => a.order - b.order));
      setLinks(linkData.sort((a, b) => a.order - b.order));
    } catch (err) {
      console.error(err);
      setError("Nepodarilo sa načítať tréningy a odkazy.");
    }
  }, [categoryId, clubSlug]);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  function changeLocation(event: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;
    setLocationForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function changeTraining(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setTrainingForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : ["location", "weekday", "order"].includes(name) ? Number(value) : value,
    }));
  }

  function changeLink(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setLinkForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function saveLocation(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      club: clubId,
      name: locationForm.name.trim(),
      address: locationForm.address.trim(),
      latitude: Number(locationForm.latitude),
      longitude: Number(locationForm.longitude),
      order: Number(locationForm.order),
      is_active: locationForm.is_active,
    };
    try {
      if (locationForm.id) await updateTrainingLocation(locationForm.id, payload);
      else await createTrainingLocation(payload);
      setLocationForm(emptyLocation);
      await loadExtras();
    } catch (err) {
      console.error(err);
      setError("Miesto sa nepodarilo uložiť. Skontroluj názov a súradnice.");
    } finally { setBusy(false); }
  }

  async function saveTraining(event: FormEvent) {
    event.preventDefault();
    if (!trainingForm.location) return setError("Najprv vyber tréningové miesto.");
    setBusy(true);
    setError("");
    const payload = {
      category: categoryId,
      location: Number(trainingForm.location),
      weekday: Number(trainingForm.weekday),
      start_time: trainingForm.start_time,
      order: Number(trainingForm.order),
      is_active: trainingForm.is_active,
    };
    try {
      if (trainingForm.id) await updateCategoryTraining(trainingForm.id, payload);
      else await createCategoryTraining(payload);
      setTrainingForm(emptyTraining);
      await loadExtras();
    } catch (err) {
      console.error(err);
      setError("Tréning sa nepodarilo uložiť.");
    } finally { setBusy(false); }
  }

  async function saveLink(event: FormEvent) {
    event.preventDefault();
    setError("");

    const nextTitle = normalizeTitle(linkForm.title);
    const hasDuplicate = links.some(
      (link) => link.id !== linkForm.id && normalizeTitle(link.title) === nextTitle
    );

    if (hasDuplicate) {
      setError("Odkaz s rovnakým názvom už v tejto kategórii existuje.");
      return;
    }

    setBusy(true);

    const payload = {
      category: categoryId,
      title: linkForm.title.trim(),
      description: linkForm.description.trim(),
      cta_text: linkForm.cta_text.trim(),
      url: linkForm.url.trim(),
      order: Number(linkForm.order),
      is_active: linkForm.is_active,
    };
    try {
      if (linkForm.id) await updateCategoryLink(linkForm.id, payload);
      else await createCategoryLink(payload);
      setLinkForm(emptyLink);
      await loadExtras();
    } catch (err) {
      console.error(err);
      setError("Odkaz sa nepodarilo uložiť. URL musí obsahovať https://.");
    } finally { setBusy(false); }
  }

  async function createDefaultLinks() {
    setBusy(true);
    setError("");

    const existingTitles = new Set(links.map((link) => normalizeTitle(link.title)));
    const nextLinks = defaultCategoryLinks.filter(
      (link) => !existingTitles.has(normalizeTitle(link.title))
    );

    if (nextLinks.length === 0) {
      setError("Predvolené odkazy už v tejto kategórii existujú.");
      setBusy(false);
      return;
    }

    try {
      await Promise.all(
        nextLinks.map((link, index) =>
          createCategoryLink({
            category: categoryId,
            title: link.title,
            description: link.description,
            cta_text: link.cta_text,
            url: "",
            order: links.length + index,
            is_active: true,
          })
        )
      );

      await loadExtras();
    } catch (err) {
      console.error(err);
      setError("Predvolené odkazy sa nepodarilo vytvoriť.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.extrasRoot}>
      {error ? <div className={styles.inlineError}>{error}</div> : null}

      <section className={styles.extraSection}>
        <div className={styles.extraHeader}><div><p className={styles.cardEyebrow}>Spoločné pre klub</p><h3>Tréningové miesta</h3></div></div>
        <div className={styles.extraList}>
          {locations.map((item) => (
            <div key={item.id} className={styles.extraItem}>
              <div><strong>{item.name}</strong><span>{item.address}</span><small>{item.latitude}, {item.longitude}</small></div>
              <div className={styles.compactActions}>
                <button type="button" onClick={() => setLocationForm({ id: item.id, name: item.name, address: item.address, latitude: String(item.latitude), longitude: String(item.longitude), order: item.order, is_active: item.is_active })}>Upraviť</button>
                <button type="button" className={styles.dangerButton} onClick={async () => { if (confirm(`Odstrániť miesto ${item.name}?`)) { await deleteTrainingLocation(item.id); await loadExtras(); } }}>Odstrániť</button>
              </div>
            </div>
          ))}
        </div>
        <form className={styles.miniForm} onSubmit={saveLocation}>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Názov</span><input name="name" value={locationForm.name} onChange={changeLocation} required /></label><label className={styles.field}><span>Adresa</span><input name="address" value={locationForm.address} onChange={changeLocation} /></label></div>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Latitude</span><input name="latitude" type="number" step="any" value={locationForm.latitude} onChange={changeLocation} required /></label><label className={styles.field}><span>Longitude</span><input name="longitude" type="number" step="any" value={locationForm.longitude} onChange={changeLocation} required /></label></div>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Poradie</span><input name="order" type="number" value={locationForm.order} onChange={changeLocation} /></label><label className={styles.checkboxField}><input name="is_active" type="checkbox" checked={locationForm.is_active} onChange={changeLocation} /> Aktívne</label></div>
          <div className={styles.compactActions}><button className={styles.secondaryButton} type="button" onClick={() => setLocationForm(emptyLocation)}>Vyčistiť</button><button className={styles.primaryButton} disabled={busy}>{locationForm.id ? "Uložiť miesto" : "Pridať miesto"}</button></div>
        </form>
      </section>

      <section className={styles.extraSection}>
        <div className={styles.extraHeader}><div><p className={styles.cardEyebrow}>Konkrétna kategória</p><h3>Tréningy</h3></div></div>
        <div className={styles.extraList}>
          {trainings.map((item) => <div key={item.id} className={styles.extraItem}><div><strong>{item.day} o {item.time}</strong><span>{item.location_name}</span></div><div className={styles.compactActions}><button type="button" onClick={() => setTrainingForm({ id: item.id, location: String(item.location), weekday: item.weekday, start_time: item.time, order: item.order, is_active: item.is_active })}>Upraviť</button><button type="button" className={styles.dangerButton} onClick={async () => { if (confirm("Odstrániť tréning?")) { await deleteCategoryTraining(item.id); await loadExtras(); } }}>Odstrániť</button></div></div>)}
        </div>
        <form className={styles.miniForm} onSubmit={saveTraining}>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Deň</span><select name="weekday" value={trainingForm.weekday} onChange={changeTraining}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={styles.field}><span>Čas</span><input name="start_time" type="time" value={trainingForm.start_time} onChange={changeTraining} required /></label></div>
          <label className={styles.field}><span>Miesto</span><select name="location" value={trainingForm.location} onChange={changeTraining} required><option value="">Vyber miesto</option>{locations.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Poradie</span><input name="order" type="number" value={trainingForm.order} onChange={changeTraining} /></label><label className={styles.checkboxField}><input name="is_active" type="checkbox" checked={trainingForm.is_active} onChange={changeTraining} /> Zobraziť</label></div>
          <div className={styles.compactActions}><button className={styles.secondaryButton} type="button" onClick={() => setTrainingForm(emptyTraining)}>Vyčistiť</button><button className={styles.primaryButton} disabled={busy}>{trainingForm.id ? "Uložiť tréning" : "Pridať tréning"}</button></div>
        </form>
      </section>

      <section className={styles.extraSection}>
        <div className={styles.extraHeader}>
          <div>
            <p className={styles.cardEyebrow}>Karty na webe</p>
            <h3>Odkazy kategórie</h3>
          </div>

          {links.length === 0 ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void createDefaultLinks()}
              disabled={busy}
            >
              Pridať predvolené odkazy
            </button>
          ) : null}
        </div>
        <div className={styles.extraList}>
          {links.length === 0 ? (
            <div className={styles.emptyInline}>
              Kategória zatiaľ nemá žiadne odkazy. Môžeš ich pridať ručne alebo
              vložiť predvolené drafty a doplniť URL.
            </div>
          ) : null}

          {links.map((item) => <div key={item.id} className={styles.extraItem}><div><strong>{item.title}</strong><span>{item.description || item.url || "URL zatiaľ nie je vyplnená"}</span><small>{item.is_active ? "Aktívny" : "Neaktívny"} · Poradie {item.order}</small></div><div className={styles.compactActions}><button type="button" onClick={() => setLinkForm({ id: item.id, title: item.title, description: item.description, cta_text: item.cta_text, url: item.url, order: item.order, is_active: item.is_active })}>Upraviť</button><button type="button" className={styles.dangerButton} onClick={async () => { if (confirm("Odstrániť odkaz?")) { await deleteCategoryLink(item.id); await loadExtras(); } }}>Odstrániť</button></div></div>)}
        </div>
        <form className={styles.miniForm} onSubmit={saveLink}>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Názov</span><input name="title" value={linkForm.title} onChange={changeLink} required /></label><label className={styles.field}><span>Text tlačidla</span><input name="cta_text" value={linkForm.cta_text} onChange={changeLink} required /></label></div>
          <label className={styles.field}><span>Popis</span><textarea name="description" rows={3} value={linkForm.description} onChange={changeLink} required /></label>
          <label className={styles.field}><span>URL</span><input name="url" type="url" value={linkForm.url} onChange={changeLink} placeholder="https://..." required /></label>
          <div className={styles.formGridCompact}><label className={styles.field}><span>Poradie</span><input name="order" type="number" value={linkForm.order} onChange={changeLink} /></label><label className={styles.checkboxField}><input name="is_active" type="checkbox" checked={linkForm.is_active} onChange={changeLink} /> Zobraziť</label></div>
          <div className={styles.compactActions}><button className={styles.secondaryButton} type="button" onClick={() => setLinkForm(emptyLink)}>Vyčistiť</button><button className={styles.primaryButton} disabled={busy}>{linkForm.id ? "Uložiť odkaz" : "Pridať odkaz"}</button></div>
        </form>
      </section>
    </div>
  );
}
