import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { uploadPostImage } from "../api/uploads";

type Props = {
  value: string;
  onChange: (html: string) => void;
  clubId: number;
};

export default function RichTextEditor({ value, onChange, clubId }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({
        placeholder: "Začni písať článok...",
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const addImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    try {
      const result = await uploadPostImage(clubId, file);
      editor.chain().focus().setImage({ src: result.url }).run();
    } catch (error) {
      console.error("Upload obrázka zlyhal", error);
      alert("Upload obrázka zlyhal.");
    }
  };

  if (!editor) return null;

  const btnStyle = (active = false): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 8,
    border: active ? "1px solid #111827" : "1px solid #d1d5db",
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    cursor: "pointer",
    fontSize: 13,
  });

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <button type="button" style={btnStyle(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </button>
        <button type="button" style={btnStyle(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button type="button" style={btnStyle(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" style={btnStyle(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </button>
        <button type="button" style={btnStyle(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Odrážky
        </button>
        <button type="button" style={btnStyle(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          Číslovanie
        </button>
        <button type="button" style={btnStyle(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Citácia
        </button>
        <button type="button" style={btnStyle()} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          Čiara
        </button>
        <button type="button" style={btnStyle()} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          Vyčistiť
        </button>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            cursor: "pointer",
            background: "#fff",
            fontSize: 13,
          }}
        >
          Obrázok
          <input type="file" accept="image/*" onChange={addImage} style={{ display: "none" }} />
        </label>
      </div>

      <div style={{ padding: 16, minHeight: 320 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}