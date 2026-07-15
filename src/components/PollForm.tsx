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

const maxVideoFileSize = 100 * 1024 * 1024;
const allowedVideoExtensions = [".mp4", ".webm", ".mov"];
const allowedVideoMimeTypes = ["video/mp4", "video/webm", "video/quicktime"];

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeFormValues(values: PollFormValues): PollFormValues {
  return {
    ...values,
    options: values.options.map((option) => ({
      ...option,
      client_id: option.client_id ?? createClientId(),
      video_file_upload: option.video_file_upload ?? null,
      remove_video_file: option.remove_video_file ?? false,
    })),
  };
}

function toIsoOrNull(value: string) {
  if (!value) return null;

  return new Date(value).toISOString();
}

function buildOrderedOptions(options: PollFormValues["options"]) {
  return options.map((option, index) => ({
    ...(option.id ? { id: option.id } : {}),
    text: option.text.trim(),
    video_url: option.video_url?.trim() || "",
    video_file_upload: option.video_file_upload ?? null,
    remove_video_file: option.remove_video_file ?? false,
    order: index,
  }));
}

function getVideoType(value?: string) {
  const videoUrl = value?.trim();

  if (!videoUrl) return "";

  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (!["http:", "https:"].includes(url.protocol)) return "Nepodporovaná URL";
    if (
      (hostname === "youtu.be" && Boolean(url.pathname.split("/").filter(Boolean)[0])) ||
      ((hostname === "youtube.com" || hostname === "www.youtube.com") &&
        url.pathname === "/watch" &&
        Boolean(url.searchParams.get("v")))
    ) {
      return "YouTube";
    }

    if (
      ((hostname === "vimeo.com" || hostname === "www.vimeo.com") &&
        /^\d+$/.test(url.pathname.replace(/^\/|\/$/g, ""))) ||
      (hostname === "player.vimeo.com" &&
        /^\/video\/\d+\/?$/.test(url.pathname))
    ) {
      return "Vimeo";
    }
    if (pathname.endsWith(".mp4")) return "MP4";
  } catch {
    return "Nepodporovaná URL";
  }

  return "Nepodporovaná URL";
}

function getVideoFileError(file: File) {
  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = allowedVideoExtensions.some((extension) =>
    fileName.endsWith(extension)
  );

  if (!hasAllowedExtension) {
    return "Video súbor musí byť MP4, WebM alebo MOV.";
  }

  if (file.type && !allowedVideoMimeTypes.includes(file.type)) {
    return "Nepodporovaný MIME typ video súboru.";
  }

  if (file.size > maxVideoFileSize) {
    return "Video súbor môže mať najviac 100 MB.";
  }

  return "";
}

function VideoPreview({ file, url }: { file?: File | null; url?: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(url ?? null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, url]);

  if (!previewUrl) return null;

  return (
    <video
      className={styles.videoPreview}
      src={previewUrl}
      controls
      playsInline
      preload="metadata"
    />
  );
}

export default function PollForm({
  initialValues = defaultValues,
  onSubmit,
  submitLabel,
  clubId,
}: Props) {
  const [values, setValues] = useState<PollFormValues>(() =>
    normalizeFormValues(initialValues)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValues(normalizeFormValues(initialValues));
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

  const handleOptionVideoChange = (index: number, value: string) => {
    setValues((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, video_url: value } : option
      ),
    }));
  };

  const handleOptionVideoFileChange = (index: number, file: File | null) => {
    if (file) {
      const fileError = getVideoFileError(file);

      if (fileError) {
        setError(fileError);
        return;
      }
    }

    setError("");

    setValues((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index
          ? {
              ...option,
              video_file_upload: file,
              remove_video_file: false,
            }
          : option
      ),
    }));
  };

  const handleRemoveOptionVideoFile = (index: number) => {
    setValues((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index
          ? {
              ...option,
              video_file: null,
              video_file_url: null,
              video_file_upload: null,
              remove_video_file: Boolean(option.video_file_url || option.video_file),
            }
          : option
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
          client_id: createClientId(),
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

    const unsupportedVideo = values.options.find((option) => {
      const videoType = getVideoType(option.video_url);
      return videoType === "Nepodporovaná URL";
    });

    if (unsupportedVideo) {
      return "Video URL musí byť YouTube, Vimeo alebo priama MP4 adresa.";
    }

    const unsupportedVideoFile = values.options.find((option) => {
      if (!option.video_file_upload) return false;

      return Boolean(getVideoFileError(option.video_file_upload));
    });

    if (unsupportedVideoFile?.video_file_upload) {
      return getVideoFileError(unsupportedVideoFile.video_file_upload);
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
            {values.options.map((option, index) => {
              const hasUploadedVideo = Boolean(
                option.video_file_upload || option.video_file_url
              );
              const hasUrlVideo = Boolean(option.video_url?.trim());
              const videoFileLabel =
                option.video_file_upload?.name ||
                option.video_file?.split("/").pop() ||
                "Nahraté video";

              return (
              <div key={option.client_id} className={styles.optionRow}>
                <div className={styles.optionOrder}>{index + 1}</div>

                <div className={styles.optionFields}>
                  <input
                    className={styles.input}
                    value={option.text}
                    onChange={(event) => handleOptionChange(index, event.target.value)}
                    placeholder={`Možnosť ${index + 1}`}
                  />

                  <input
                    className={styles.input}
                    value={option.video_url ?? ""}
                    onChange={(event) =>
                      handleOptionVideoChange(index, event.target.value)
                    }
                    placeholder="Video URL (voliteľné): https://www.youtube.com/watch?v=..."
                  />

                  {option.video_url?.trim() ? (
                    <div className={styles.videoHint}>
                      <span>{getVideoType(option.video_url)}</span>
                      <a
                        href={option.video_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Otvoriť video
                      </a>
                    </div>
                  ) : null}

                  <div className={styles.videoUploadBox}>
                    <label className={styles.fileButton}>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        onChange={(event) =>
                          handleOptionVideoFileChange(
                            index,
                            event.target.files?.[0] ?? null
                          )
                        }
                      />
                      Nahrať video súbor
                    </label>

                    <span className={styles.fileMeta}>
                      MP4, WebM alebo MOV · max. 100 MB
                    </span>
                  </div>

                  {hasUploadedVideo ? (
                    <div className={styles.videoFilePanel}>
                      <VideoPreview
                        file={option.video_file_upload}
                        url={option.video_file_url}
                      />

                      <div className={styles.videoFileActions}>
                        <span className={styles.videoFileName}>
                          {videoFileLabel}
                        </span>

                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => handleRemoveOptionVideoFile(index)}
                        >
                          Odstrániť video súbor
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {hasUploadedVideo && hasUrlVideo ? (
                    <div className={styles.videoWarning}>
                      Verejne sa použije nahraté video. URL ostane uložená ako záloha.
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleRemoveOption(index)}
                  disabled={values.options.length <= 2}
                >
                  Odstrániť
                </button>
              </div>
              );
            })}
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
