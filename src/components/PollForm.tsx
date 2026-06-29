import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { PollFormValues, PollPayload } from "../types/poll";
import styles from "./PollForm.module.css";

type Props = {
  initialValues?: PollFormValues;
  onSubmit: (payload: PollPayload) => Promise<void>;
  submitLabel: string;
  clubId: number;
};

const defaultValues: PollFormValues = {
  question: "",
  description: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
  options: [
    { text: "", order: 0 },
    { text: "", order: 1 },
  ],
};

function toIsoOrNull(value: string) {
  if (!value) return null;

  return new Date(value).toISOString();
}

function buildOrderedOptions(options: PollFormValues["options"]) {
  return options.map((option, index) => ({
    ...(option.id ? { id: option.id } : {}),
    text: option.text.trim(),
    order: index,
  }));
}

export default function PollForm({
  initialValues = defaultValues,
  onSubmit,
  submitLabel,
  clubId,
}: Props) {
  const [values, setValues] = useState<PollFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const filledOptionsCount = useMemo(
    () => values.options.filter((option) => option.text.trim()).length,
    [values.options]
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = event.target as HTMLInputElement;
    const { name, value, type } = target;

    setValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setValues((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, text: value } : option
      ),
    }));
  };

  const handleAddOption = () => {
    setValues((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          text: "",
          order: prev.options.length,
        },
      ],
    }));
  };

  const handleRemoveOption = (index: number) => {
    setValues((prev) => {
      if (prev.options.length <= 2) {
        return prev;
      }

      return {
        ...prev,
        options: prev.options
          .filter((_, optionIndex) => optionIndex !== index)
          .map((option, optionIndex) => ({
            ...option,
            order: optionIndex,
          })),
      };
    });
  };

  const validate = () => {
    if (!values.question.trim()) {
      return "Otázka ankety je povinná.";
    }

    if (filledOptionsCount < 2) {
      return "Anketa musí mať aspoň 2 neprázdne možnosti.";
    }

    if (values.starts_at && values.ends_at) {
      const startsAt = new Date(values.starts_at);
      const endsAt = new Date(values.ends_at);

      if (endsAt <= startsAt) {
        return "Koniec hlasovania musí byť po začiatku.";
      }
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit({
        club: clubId,
        question: values.question.trim(),
        description: values.description.trim(),
        is_active: values.is_active,
        starts_at: toIsoOrNull(values.starts_at),
        ends_at: toIsoOrNull(values.ends_at),
        options: buildOrderedOptions(
          values.options.filter((option) => option.text.trim())
        ),
      });
    } catch {
      setError("Uloženie ankety sa nepodarilo.");
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
                Otázka a krátky kontext ankety.
              </p>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Otázka ankety</label>
            <input
              className={styles.input}
              name="question"
              value={values.question}
              onChange={handleChange}
              placeholder="Napr. Ktorý termín tréningu vám vyhovuje?"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Popis</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              name="description"
              value={values.description}
              onChange={handleChange}
              placeholder="Voliteľný popis ankety"
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Možnosti odpovedí</h2>
              <p className={styles.cardDescription}>
                Poradie možností sa uloží podľa poradia v zozname.
              </p>
            </div>
          </div>

          <div className={styles.optionsList}>
            {values.options.map((option, index) => (
              <div key={`${option.id ?? "new"}-${index}`} className={styles.optionRow}>
                <div className={styles.optionOrder}>{index + 1}</div>

                <input
                  className={styles.input}
                  value={option.text}
                  onChange={(event) => handleOptionChange(index, event.target.value)}
                  placeholder={`Možnosť ${index + 1}`}
                />

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleRemoveOption(index)}
                  disabled={values.options.length <= 2}
                >
                  Odstrániť
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleAddOption}
          >
            Pridať možnosť
          </button>
        </section>
      </div>

      <aside className={styles.sideColumn}>
        <section className={styles.card}>
          <div className={styles.sideTopRow}>
            <div>
              <h3 className={styles.cardTitleSmall}>Publikovanie</h3>
              <p className={styles.cardDescriptionSmall}>
                Aktivita a časové okno hlasovania.
              </p>
            </div>

            <span
              className={`${styles.statusBadge} ${
                values.is_active ? styles.statusPublished : styles.statusDraft
              }`}
            >
              {values.is_active ? "Aktívna" : "Neaktívna"}
            </span>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="is_active"
              checked={values.is_active}
              onChange={handleChange}
            />
            <span>Aktívna anketa</span>
          </label>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Začiatok hlasovania</label>
            <input
              className={styles.input}
              type="datetime-local"
              name="starts_at"
              value={values.starts_at}
              onChange={handleChange}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Koniec hlasovania</label>
            <input
              className={styles.input}
              type="datetime-local"
              name="ends_at"
              value={values.ends_at}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitleSmall}>Súhrn</h3>
          <dl className={styles.summaryList}>
            <div>
              <dt>Možnosti</dt>
              <dd>{filledOptionsCount}</dd>
            </div>
            <div>
              <dt>Stav</dt>
              <dd>{values.is_active ? "Aktívna" : "Neaktívna"}</dd>
            </div>
          </dl>
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
