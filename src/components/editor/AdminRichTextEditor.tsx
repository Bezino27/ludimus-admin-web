import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import styles from "./AdminRichTextEditor.module.css";

type RibbonTab = "home" | "insert" | "format" | "table";

type AdminRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  onUploadImage?: (file: File) => Promise<string>;
  imageAltText?: string;
};

type ToolbarButtonProps = {
  children: ReactNode;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
};

const TEXT_COLORS = [
  ["#111827", "Čierna"],
  ["#64748b", "Sivá"],
  ["#84101a", "Bordová"],
  ["#dc2626", "Červená"],
  ["#2563eb", "Modrá"],
  ["#16a34a", "Zelená"],
  ["#ea580c", "Oranžová"],
  ["#b7791f", "Zlatá"],
] as const;

const AlignedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      imageAlign: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => {
          const align = attributes.imageAlign;

          if (align === "right") {
            return {
              "data-align": "right",
              class: "image-align-right",
            };
          }

          if (align === "left") {
            return {
              "data-align": "left",
              class: "image-align-left",
            };
          }

          return {
            "data-align": "center",
            class: "image-align-center",
          };
        },
      },
    };
  },
});

function cleanPastedHtml(html: string) {
  return html
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\sclass="[^"]*Mso[^"]*"/gi, "")
    .replace(/\sstyle="[^"]*mso-[^"]*"/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/<\/?font[^>]*>/gi, "")
    .replace(/<span[^>]*>/gi, "")
    .replace(/<\/span>/gi, "");
}

function ToolbarButton({
  children,
  title,
  active = false,
  disabled = false,
  danger = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      className={`${styles.toolbarButton} ${
        active ? styles.toolbarButtonActive : ""
      } ${danger ? styles.toolbarButtonDanger : ""}`}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled) onClick();
      }}
    >
      {children}
    </button>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.2 7.2H6V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 7.4A8 8 0 1 1 5 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.8 7.2H18V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.6 7.4A8 8 0 1 0 19 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 4h12l2 2v14H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 4v6h8V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 20v-6h8v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {expanded ? (
        <>
          <path
            d="M9 4v5H4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 20v-5h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M4 9V4h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 15v5h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

function canRun(editor: Editor | null, command: (editor: Editor) => boolean) {
  if (!editor) return false;
  return command(editor);
}

export default function AdminRichTextEditor({
  value,
  onChange,
  placeholder = "Začni písať...",
  minHeight = 300,
  onUploadImage,
  imageAltText = "",
}: AdminRichTextEditorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const colorSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const [activeTab, setActiveTab] = useState<RibbonTab>("home");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [selectionVersion, setSelectionVersion] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      AlignedImage.configure({
        allowBase64: false,
        HTMLAttributes: {
          loading: "lazy",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      CharacterCount,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.editorContent,
      },
      transformPastedHTML: cleanPastedHtml,
      handleDOMEvents: {
        dragstart: (view, event) => {
          const target = event.target;

          if (!(target instanceof HTMLImageElement)) {
            return false;
          }

          const position = view.posAtDOM(target, 0);

          if (typeof position !== "number") {
            return false;
          }

          view.dispatch(
            view.state.tr.setSelection(
              NodeSelection.create(view.state.doc, position),
            ),
          );

          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
          }

          setIsImageSelected(true);
          return false;
        },
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files || []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (!files.length || !onUploadImage) return false;

        event.preventDefault();
        void insertImageFiles(files, view.state.selection.from);
        return true;
      },
      handleDrop: (view, event) => {
        if (view.dragging) {
          return false;
        }

        const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (!files.length || !onUploadImage) return false;

        event.preventDefault();

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        void insertImageFiles(files, coordinates?.pos ?? view.state.selection.from);
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setIsImageSelected(currentEditor.isActive("image"));
      setSelectionVersion((current) => current + 1);
      onChange(currentEditor.getHTML());
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      setIsImageSelected(currentEditor.isActive("image"));
      setSelectionVersion((current) => current + 1);
    },
    onFocus: ({ editor: currentEditor }) => {
      setIsImageSelected(currentEditor.isActive("image"));
      setSelectionVersion((current) => current + 1);
    },
    onBlur: ({ editor: currentEditor }) => {
      setIsImageSelected(currentEditor.isActive("image"));
      setSelectionVersion((current) => current + 1);
    },
  });

  async function insertImageFiles(files: File[], position?: number) {
    if (!editor || !onUploadImage) return;

    try {
      setIsUploading(true);
      let insertPosition = position;

      for (const file of files) {
        const url = await onUploadImage(file);
        const alt = imageAltText.trim();
        const imageNode = {
          type: "image",
          attrs: { src: url, alt },
        };

        if (typeof insertPosition === "number") {
          editor.chain().focus().insertContentAt(insertPosition, imageNode).run();
          insertPosition += 1;
        } else {
          editor.chain().focus().insertContent(imageNode).run();
        }
      }
    } catch (error) {
      console.error("Upload obrázka zlyhal", error);
      window.alert("Upload obrázka zlyhal.");
    } finally {
      setIsUploading(false);
    }
  }

  useEffect(() => {
    if (!editor) return;

    const nextValue = value || "";

    if (!editor.isFocused && editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const rootStyle = {
    "--admin-editor-min-height": `${minHeight}px`,
  } as CSSProperties;

  const selectedRange = () => {
    const { from, to } = editor.state.selection;
    return { from, to };
  };

  const restoreSelection = (from: number, to: number) => {
    editor.chain().focus().setTextSelection({ from, to }).run();
  };

  const setLink = () => {
    const { from, to } = selectedRange();
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Vlož URL odkazu:", previousUrl || "https://");

    if (url === null) return;

    restoreSelection(from, to);

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addImageByUrl = () => {
    const { from, to } = selectedRange();
    const url = window.prompt("Vlož URL obrázka:", "https://");

    if (!url?.trim()) return;

    const alt = imageAltText.trim();

    restoreSelection(from, to);

    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: url.trim(),
          alt,
        },
      })
      .run();
  };

  const addImage = () => {
    if (onUploadImage) {
      fileInputRef.current?.click();
      return;
    }

    addImageByUrl();
  };

  const deleteSelectedImage = () => {
    if (!isImageSelected && !editor.isActive("image")) {
      window.alert("Najprv klikni na obrázok v editore a potom ho zmaž.");
      return;
    }

    editor.chain().focus().deleteSelection().run();
    setIsImageSelected(false);
    setSelectionVersion((current) => current + 1);
  };

  const setImageAlign = (imageAlign: "left" | "center" | "right") => {
    if (!isImageSelected && !editor.isActive("image")) {
      window.alert("Najprv klikni na obrázok v editore.");
      return;
    }

    editor.chain().focus().updateAttributes("image", { imageAlign }).run();
    setSelectionVersion((current) => current + 1);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    event.target.value = "";

    if (!files.length) return;
    await insertImageFiles(files);
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  const rememberColorSelection = () => {
    const { from, to } = editor.state.selection;
    colorSelectionRef.current = { from, to };
  };

  const setTextColor = (color: string) => {
    const selection = colorSelectionRef.current ?? selectedRange();
    const chain = editor
      .chain()
      .focus()
      .setTextSelection({ from: selection.from, to: selection.to });

    if (color) {
      chain.setColor(color).run();
    } else {
      chain.unsetColor().run();
    }

    colorSelectionRef.current = null;
  };

  const submitClosestForm = () => {
    wrapperRef.current?.closest("form")?.requestSubmit();
  };

  const wordCount = editor.storage.characterCount.words();
  const characterCount = editor.storage.characterCount.characters();
  const activeTextColor =
    (editor.getAttributes("textStyle").color as string | undefined) || "";
  const normalizedActiveTextColor = activeTextColor.toLowerCase();

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${isExpanded ? styles.wrapperExpanded : ""}`}
      style={rootStyle}
      data-selection-version={selectionVersion}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hiddenFileInput}
        onChange={(event) => void handleFileChange(event)}
      />

      <div className={styles.ribbon}>
        <div className={styles.ribbonTopBar}>
          <div className={styles.quickActions}>
            <ToolbarButton
              title="Späť"
              disabled={!canRun(editor, (current) =>
                current.can().chain().focus().undo().run()
              )}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <UndoIcon />
            </ToolbarButton>

            <ToolbarButton
              title="Dopredu"
              disabled={!canRun(editor, (current) =>
                current.can().chain().focus().redo().run()
              )}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <RedoIcon />
            </ToolbarButton>
          </div>

          <div className={styles.ribbonTabs}>
            <button
              type="button"
              className={`${styles.ribbonTab} ${
                activeTab === "home" ? styles.ribbonTabActive : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                setActiveTab("home");
              }}
            >
              Domov
            </button>

            <button
              type="button"
              className={`${styles.ribbonTab} ${
                activeTab === "insert" ? styles.ribbonTabActive : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                setActiveTab("insert");
              }}
            >
              Vložiť
            </button>

            <button
              type="button"
              className={`${styles.ribbonTab} ${
                activeTab === "format" ? styles.ribbonTabActive : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                setActiveTab("format");
              }}
            >
              Formát
            </button>

            <button
              type="button"
              className={`${styles.ribbonTab} ${
                activeTab === "table" ? styles.ribbonTabActive : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                setActiveTab("table");
              }}
            >
              Tabuľka
            </button>
          </div>

          <div className={styles.quickActions}>
            <ToolbarButton title="Uložiť" onClick={submitClosestForm}>
              <SaveIcon />
            </ToolbarButton>

            <ToolbarButton
              title={isExpanded ? "Zmenšiť editor" : "Zväčšiť editor"}
              active={isExpanded}
              onClick={() => setIsExpanded((current) => !current)}
            >
              <ExpandIcon expanded={isExpanded} />
            </ToolbarButton>

            <ToolbarButton
              active={isPreviewMode}
              onClick={() => setIsPreviewMode((current) => !current)}
            >
              Preview
            </ToolbarButton>
          </div>
        </div>

        <div className={styles.ribbonPanel}>
          {activeTab === "home" ? (
            <>
              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton
                    active={editor.isActive("paragraph")}
                    onClick={() => editor.chain().focus().setParagraph().run()}
                  >
                    Text
                  </ToolbarButton>

                  <ToolbarButton
                    active={editor.isActive("heading", { level: 2 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                  >
                    H2
                  </ToolbarButton>

                  <ToolbarButton
                    active={editor.isActive("heading", { level: 3 })}
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                  >
                    H3
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Štýl textu</div>
              </div>

              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton
                    title="Tučné"
                    active={editor.isActive("bold")}
                    disabled={!canRun(editor, (current) =>
                      current.can().chain().focus().toggleBold().run()
                    )}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    B
                  </ToolbarButton>

                  <ToolbarButton
                    title="Kurzíva"
                    active={editor.isActive("italic")}
                    disabled={!canRun(editor, (current) =>
                      current.can().chain().focus().toggleItalic().run()
                    )}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    I
                  </ToolbarButton>

                  <div className={styles.colorSwatches} aria-label="Farba textu">
                    {TEXT_COLORS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.colorSwatch} ${
                          normalizedActiveTextColor === value ? styles.colorSwatchActive : ""
                        }`}
                        style={{ "--swatch-color": value } as CSSProperties}
                        title={label}
                        aria-label={`Farba textu: ${label}`}
                        aria-pressed={normalizedActiveTextColor === value}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          rememberColorSelection();
                          setTextColor(value);
                        }}
                      />
                    ))}
                  </div>

                  <ToolbarButton onClick={clearFormatting}>Vyčistiť</ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Formátovanie</div>
              </div>

              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    Odrážky
                  </ToolbarButton>

                  <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    Číslovanie
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Zoznamy</div>
              </div>
            </>
          ) : null}

          {activeTab === "insert" ? (
            <>
              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton active={editor.isActive("link")} onClick={setLink}>
                    Link
                  </ToolbarButton>

                  <ToolbarButton
                    disabled={!editor.isActive("link")}
                    onClick={() =>
                      editor.chain().focus().extendMarkRange("link").unsetLink().run()
                    }
                  >
                    Zrušiť link
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Odkazy</div>
              </div>

              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton disabled={isUploading} onClick={addImage}>
                    {isUploading ? "Nahrávam..." : "Obrázok"}
                  </ToolbarButton>

                  <ToolbarButton
                    danger
                    disabled={!isImageSelected}
                    onClick={deleteSelectedImage}
                  >
                    Zmazať obrázok
                  </ToolbarButton>

                  <ToolbarButton
                    disabled={!isImageSelected}
                    onClick={() => setImageAlign("left")}
                  >
                    Vľavo
                  </ToolbarButton>

                  <ToolbarButton
                    disabled={!isImageSelected}
                    onClick={() => setImageAlign("center")}
                  >
                    Stred
                  </ToolbarButton>

                  <ToolbarButton
                    disabled={!isImageSelected}
                    onClick={() => setImageAlign("right")}
                  >
                    Vpravo
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Médiá</div>
              </div>

              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                    Čiara
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Prvky</div>
              </div>
            </>
          ) : null}

          {activeTab === "format" ? (
            <>
              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton
                    active={editor.isActive("blockquote")}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  >
                    Citácia
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Bloky</div>
              </div>

              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton
                    active={editor.isActive({ textAlign: "left" })}
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                  >
                    Vľavo
                  </ToolbarButton>

                  <ToolbarButton
                    active={editor.isActive({ textAlign: "center" })}
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                  >
                    Stred
                  </ToolbarButton>

                  <ToolbarButton
                    active={editor.isActive({ textAlign: "right" })}
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                  >
                    Vpravo
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Zarovnanie</div>
              </div>
            </>
          ) : null}

          {activeTab === "table" ? (
            <>
              <div className={styles.ribbonGroup}>
                <div className={styles.ribbonGroupContent}>
                  <ToolbarButton
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    }
                  >
                    Vložiť tabuľku
                  </ToolbarButton>

                  <ToolbarButton
                    disabled={!editor.can().addColumnAfter()}
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                  >
                    + Stĺpec
                  </ToolbarButton>

                  <ToolbarButton
                    disabled={!editor.can().addRowAfter()}
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                  >
                    + Riadok
                  </ToolbarButton>

                  <ToolbarButton
                    danger
                    disabled={!editor.can().deleteTable()}
                    onClick={() => editor.chain().focus().deleteTable().run()}
                  >
                    Zmazať tabuľku
                  </ToolbarButton>
                </div>
                <div className={styles.ribbonGroupLabel}>Tabuľka</div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {isPreviewMode ? (
        <div
          className={`${styles.editorBody} ${styles.editorContent} ${styles.previewBody}`}
          dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      ) : (
        <EditorContent className={styles.editorBody} editor={editor} />
      )}

      <div className={styles.footerBar}>
        <span>{wordCount} slov</span>
        <span>{characterCount} znakov</span>
        <span>{onUploadImage ? "Obrázky: upload súboru" : "Obrázky: URL"}</span>
      </div>
    </div>
  );
}
