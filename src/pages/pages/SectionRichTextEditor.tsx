import { useEffect, useRef, useState } from "react";
import styles from "./PagesAdmin.module.css";

type SectionRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function normalizeBlockValue(value: string) {
  return value || "p";
}

export default function SectionRichTextEditor({
  value,
  onChange,
}: SectionRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef(value || "");
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || showHtml) return;

    const nextHtml = value || "";
    const isFocused = document.activeElement === editor;

    if (!isFocused && editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
      lastHtmlRef.current = nextHtml;
    }
  }, [value, showHtml]);

  const emitChange = () => {
    const html = editorRef.current?.innerHTML ?? "";
    lastHtmlRef.current = html;
    onChange(html);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const setBlock = (block: string) => {
    runCommand("formatBlock", normalizeBlockValue(block));
  };

  const addLink = () => {
    const url = window.prompt("Vlož URL odkazu:");
    if (!url) return;
    runCommand("createLink", url);
  };

  const addImage = () => {
    const url = window.prompt("Vlož URL obrázka:");
    if (!url) return;
    runCommand("insertImage", url);
  };

  const clearFormatting = () => {
    runCommand("removeFormat");
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");

    if (html) {
      document.execCommand("insertHTML", false, html);
    } else if (text) {
      document.execCommand("insertText", false, text);
    }

    emitChange();
  };

  const handleHtmlChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    lastHtmlRef.current = nextValue;
    onChange(nextValue);
  };

  return (
    <div className={styles.richEditorWrapper}>
      <div className={styles.richToolbar}>
        <button type="button" onClick={() => setBlock("p")}>Text</button>
        <button type="button" onClick={() => setBlock("h2")}>H2</button>
        <button type="button" onClick={() => setBlock("h3")}>H3</button>
        <button type="button" onClick={() => runCommand("bold")}>B</button>
        <button type="button" onClick={() => runCommand("italic")}>I</button>
        <button type="button" onClick={() => runCommand("insertUnorderedList")}>Odrážky</button>
        <button type="button" onClick={() => runCommand("insertOrderedList")}>Číslovanie</button>
        <button type="button" onClick={() => setBlock("blockquote")}>Citácia</button>
        <button type="button" onClick={() => runCommand("insertHorizontalRule")}>Čiara</button>
        <button type="button" onClick={addLink}>Odkaz</button>
        <button type="button" onClick={addImage}>Obrázok</button>
        <button type="button" onClick={clearFormatting}>Vyčistiť</button>
        <button type="button" onClick={() => setShowHtml((current) => !current)}>
          {showHtml ? "Editor" : "HTML"}
        </button>
      </div>

      {showHtml ? (
        <textarea
          className={styles.richHtmlTextarea}
          value={value || ""}
          onChange={handleHtmlChange}
        />
      ) : (
        <div
          ref={editorRef}
          className={styles.richTextarea}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Napíš obsah sekcie..."
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
        />
      )}
    </div>
  );
}
