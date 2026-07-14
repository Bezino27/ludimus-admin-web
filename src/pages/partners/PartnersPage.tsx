import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createAdminPartner,
  deleteAdminPartner,
  getAdminPartners,
  getPartnerTierOptions,
  moveAdminPartner,
  patchAdminPartner,
  updateAdminPartner,
} from "../../api/partners";
import { getCurrentClubSeason } from "../../api/pages";
import { useAuth } from "../../context/useAuth";
import type { AdminClubSeason } from "../../types/page";
import type {
  AdminPartner,
  AdminPartnerPayload,
  PartnerTier,
  PartnerTierOption,
} from "../../types/partner";
import styles from "./PartnersPage.module.css";

type MinimalMembership = {
  is_active: boolean;
  club_slug?: string;
  club_name?: string;
};

const FALLBACK_TIERS: PartnerTierOption[] = [
  { value: "", label: "Bez rozdelenia" },
  { value: "general", label: "Generálny partner" },
  { value: "main", label: "Hlavný partner" },
  { value: "partner", label: "Partner" },
  { value: "media", label: "Mediálny partner" },
];

const TIER_ORDER: PartnerTier[] = [
  "general",
  "main",
  "partner",
  "media",
  "",
];

const emptyForm = {
  id: null as number | null,
  name: "",
  website: "",
  logo_url: "",
  logo: null as File | null,
  tier: "" as PartnerTier,
  is_active: true,
};

export default function PartnersPage() {
  const { user } = useAuth();

  const memberships = (user?.memberships ?? []) as MinimalMembership[];
  const activeClub =
    memberships.find((membership) => membership.is_active) ?? memberships[0];
  const activeClubSlug = activeClub?.club_slug || "";

  const [clubSeason, setClubSeason] = useState<AdminClubSeason | null>(null);
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [tierOptions, setTierOptions] =
    useState<PartnerTierOption[]>(FALLBACK_TIERS);
  const [form, setForm] = useState(emptyForm);
  const [selectedPartner, setSelectedPartner] =
    useState<AdminPartner | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyPartnerId, setBusyPartnerId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const groupedPartners = useMemo(() => {
    const groups = new Map<PartnerTier, AdminPartner[]>();

    TIER_ORDER.forEach((tier) => groups.set(tier, []));

    [...partners]
      .sort((a, b) => {
        const tierCompare =
          TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);

        if (tierCompare !== 0) {
          return tierCompare;
        }

        if (a.order !== b.order) {
          return a.order - b.order;
        }

        return a.name.localeCompare(b.name, "sk");
      })
      .forEach((partner) => {
        const tier = TIER_ORDER.includes(partner.tier) ? partner.tier : "";
        groups.get(tier)?.push(partner);
      });

    return TIER_ORDER.map((tier) => {
      const items = groups.get(tier) || [];

      return {
        tier,
        label:
          tierOptions.find((option) => option.value === tier)?.label ||
          FALLBACK_TIERS.find((option) => option.value === tier)?.label ||
          "Partneri",
        items,
        activeCount: items.filter((partner) => partner.is_active).length,
        fallbackOrder: TIER_ORDER.indexOf(tier),
      };
    }).sort((a, b) => {
      if (a.activeCount !== b.activeCount) {
        return b.activeCount - a.activeCount;
      }

      return a.fallbackOrder - b.fallbackOrder;
    });
  }, [partners, tierOptions]);

  const stats = useMemo(() => {
    const activeCount = partners.filter((partner) => partner.is_active).length;
    const categorizedCount = partners.filter((partner) => partner.tier).length;

    return {
      total: partners.length,
      active: activeCount,
      inactive: partners.length - activeCount,
      categorized: categorizedCount,
    };
  }, [partners]);

  async function loadData() {
    if (!activeClubSlug) {
      setIsLoading(false);
      setErrorMessage("Nie je vybraný aktívny klub.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const [partnerData, tierData, seasonData] = await Promise.all([
        getAdminPartners(activeClubSlug),
        getPartnerTierOptions().catch(() => FALLBACK_TIERS),
        getCurrentClubSeason(activeClubSlug),
      ]);

      setPartners(partnerData);
      setTierOptions(tierData.length ? tierData : FALLBACK_TIERS);
      setClubSeason(seasonData);
    } catch (error) {
      console.error(error);
      setErrorMessage("Nepodarilo sa načítať partnerov.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClubSlug]);

  function resetForm() {
    setSelectedPartner(null);
    setForm(emptyForm);
    setMessage("");
    setErrorMessage("");
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setForm((current) => ({
      ...current,
      logo: file,
    }));
  }

  function handleEdit(partner: AdminPartner) {
    setSelectedPartner(partner);
    setMessage("");
    setErrorMessage("");

    setForm({
      id: partner.id,
      name: partner.name,
      website: partner.website || "",
      logo_url: partner.logo_url || "",
      logo: null,
      tier: partner.tier || "",
      is_active: partner.is_active,
    });

    window.requestAnimationFrame(() => {
      document
        .getElementById("partner-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function buildPayload(): AdminPartnerPayload {
    if (!clubSeason?.club) {
      throw new Error("Chýba klub.");
    }

    return {
      club: clubSeason.club,
      name: form.name,
      website: form.website,
      logo_url: form.logo_url,
      logo: form.logo,
      tier: form.tier,
      is_active: form.is_active,
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
        await updateAdminPartner(form.id, payload);
        setMessage("Partner bol upravený.");
      } else {
        await createAdminPartner(payload);
        setMessage("Partner bol vytvorený.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Partnera sa nepodarilo uložiť. Skontroluj názov a logo."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(partner: AdminPartner) {
    if (!window.confirm(`Naozaj chceš odstrániť partnera ${partner.name}?`)) {
      return;
    }

    setBusyPartnerId(partner.id);
    setMessage("");
    setErrorMessage("");

    try {
      await deleteAdminPartner(partner.id);

      if (selectedPartner?.id === partner.id) {
        resetForm();
      }

      setMessage("Partner bol odstránený.");
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage("Partnera sa nepodarilo odstrániť.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  async function handleMove(
    partner: AdminPartner,
    direction: "up" | "down"
  ) {
    setBusyPartnerId(partner.id);
    setMessage("");
    setErrorMessage("");

    try {
      const updated = await moveAdminPartner(partner.id, direction);

      if (updated.length) {
        setPartners(updated);
      } else {
        await loadData();
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Poradie partnera sa nepodarilo zmeniť.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  async function handleInlineTierChange(
    partner: AdminPartner,
    tier: PartnerTier
  ) {
    setBusyPartnerId(partner.id);
    setMessage("");
    setErrorMessage("");

    try {
      await patchAdminPartner(partner.id, { tier });
      setMessage("Typ partnera bol zmenený.");
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage("Typ partnera sa nepodarilo zmeniť.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  async function handleActiveChange(
    partner: AdminPartner,
    isActive: boolean
  ) {
    setBusyPartnerId(partner.id);
    setMessage("");
    setErrorMessage("");

    try {
      const updated = await patchAdminPartner(partner.id, {
        is_active: isActive,
      });

      setPartners((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Stav partnera sa nepodarilo zmeniť.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.headingWrap}>
          <p className={styles.eyebrow}>Obsah webu</p>
          <h1 className={styles.title}>Partneri</h1>
          <p className={styles.subtitle}>
            Správa partnerov pre klub{" "}
            <strong>{activeClub?.club_name || "Aktívny klub"}</strong>.
            Typ partnera je nepovinný.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={resetForm}
        >
          Pridať partnera
        </button>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Partneri</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Aktívni</p>
          <p className={styles.statValue}>{stats.active}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Neaktívni</p>
          <p className={styles.statValue}>{stats.inactive}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Zaradení do skupiny</p>
          <p className={styles.statValue}>{stats.categorized}</p>
        </div>
      </section>

      {errorMessage ? (
        <div className={styles.errorBox}>{errorMessage}</div>
      ) : null}

      {message ? <div className={styles.successBox}>{message}</div> : null}

      <div className={styles.twoColumn}>
        <section className={styles.groupsColumn}>
          {isLoading ? (
            <div className={styles.emptyState}>Načítavam partnerov...</div>
          ) : partners.length === 0 ? (
            <div className={styles.emptyState}>
              Zatiaľ nie sú pridaní žiadni partneri.
            </div>
          ) : (
            groupedPartners.map((group) => (
              <section className={styles.groupCard} key={group.tier || "none"}>
                <div className={styles.groupHeader}>
                  <div>
                    <p className={styles.cardEyebrow}>Skupina</p>
                    <h2>{group.label}</h2>
                  </div>
                  <span className={styles.groupCount}>
                    {group.items.length}
                  </span>
                </div>

                {group.items.length === 0 ? (
                  <div className={styles.groupEmpty}>
                    V tejto skupine zatiaľ nie sú partneri.
                  </div>
                ) : (
                  <div className={styles.partnerList}>
                    {group.items.map((partner, index) => {
                      const isBusy = busyPartnerId === partner.id;
                      const isFirst = index === 0;
                      const isLast = index === group.items.length - 1;

                      return (
                        <article className={styles.partnerRow} key={partner.id}>
                          <button
                            type="button"
                            className={styles.partnerMain}
                            onClick={() => handleEdit(partner)}
                            aria-label={`Upraviť partnera ${partner.name}`}
                          >
                            <span className={styles.logoBox}>
                              {partner.image_url ? (
                                <img src={partner.image_url} alt="" />
                              ) : (
                                <span className={styles.logoFallback}>
                                  {partner.name.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </span>

                            <span className={styles.partnerText}>
                              <strong>{partner.name}</strong>
                              <small>
                                Poradie {partner.order} ·{" "}
                                {partner.website || "Bez webovej adresy"}
                              </small>
                            </span>
                          </button>

                          <div className={styles.inlineControls}>
                            <select
                              value={partner.tier}
                              onChange={(event) =>
                                void handleInlineTierChange(
                                  partner,
                                  event.target.value as PartnerTier
                                )
                              }
                              disabled={isBusy}
                              aria-label={`Typ partnera ${partner.name}`}
                            >
                              {tierOptions.map((option) => (
                                <option
                                  key={option.value || "none"}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <label className={styles.activeToggle}>
                              <input
                                type="checkbox"
                                checked={partner.is_active}
                                disabled={isBusy}
                                onChange={(event) =>
                                  void handleActiveChange(
                                    partner,
                                    event.target.checked
                                  )
                                }
                              />
                              <span>
                                {partner.is_active ? "Aktívny" : "Skrytý"}
                              </span>
                            </label>

                            <div className={styles.orderButtons}>
                              <button
                                type="button"
                                onClick={() => void handleMove(partner, "up")}
                                disabled={isBusy || isFirst}
                                aria-label={`Posunúť ${partner.name} hore`}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleMove(partner, "down")}
                                disabled={isBusy || isLast}
                                aria-label={`Posunúť ${partner.name} dole`}
                              >
                                ↓
                              </button>
                            </div>

                            <button
                              type="button"
                              className={styles.editButton}
                              onClick={() => handleEdit(partner)}
                              disabled={isBusy}
                            >
                              Upraviť
                            </button>

                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => void handleDelete(partner)}
                              disabled={isBusy}
                            >
                              Odstrániť
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))
          )}
        </section>

        <form
          id="partner-form"
          className={styles.sideForm}
          onSubmit={handleSubmit}
        >
          <div>
            <p className={styles.cardEyebrow}>
              {selectedPartner ? "Úprava partnera" : "Nový partner"}
            </p>
            <h2>
              {selectedPartner ? selectedPartner.name : "Pridať partnera"}
            </h2>
          </div>

          <label className={styles.field}>
            <span>Názov</span>
            <input
              name="name"
              value={form.name}
              onChange={handleInputChange}
              required
              placeholder="Názov partnera"
            />
          </label>

          <label className={styles.field}>
            <span>Typ partnera</span>
            <select
              name="tier"
              value={form.tier}
              onChange={handleInputChange}
            >
              {tierOptions.map((option) => (
                <option
                  key={option.value || "none"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Webová stránka</span>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </label>

          <label className={styles.field}>
            <span>Externá URL loga</span>
            <input
              type="url"
              name="logo_url"
              value={form.logo_url}
              onChange={handleInputChange}
              placeholder="Nepovinné, ak nahráš logo"
            />
          </label>

          <label className={styles.field}>
            <span>Logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
            />
          </label>

          {selectedPartner?.image_url ? (
            <div className={styles.currentLogo}>
              <span>Aktuálne logo</span>
              <img src={selectedPartner.image_url} alt={selectedPartner.name} />
            </div>
          ) : null}

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleInputChange}
            />
            Zobraziť na verejnom webe
          </label>

          <p className={styles.formHint}>
            Pri zmene typu sa partner automaticky presunie na koniec novej
            skupiny.
          </p>

          <div className={styles.formActions}>
            {selectedPartner ? (
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
                : selectedPartner
                  ? "Uložiť zmeny"
                  : "Vytvoriť partnera"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
