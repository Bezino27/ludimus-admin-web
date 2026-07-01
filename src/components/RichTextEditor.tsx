import { uploadPostImage } from "../api/uploads";
import AdminRichTextEditor from "./editor/AdminRichTextEditor";

type Props = {
  value: string;
  onChange: (html: string) => void;
  clubId: number;
};

export default function RichTextEditor({ value, onChange, clubId }: Props) {
  return (
    <AdminRichTextEditor
      value={value}
      onChange={onChange}
      placeholder="Začni písať článok..."
      minHeight={320}
      onUploadImage={async (file) => {
        const result = await uploadPostImage(clubId, file);
        return result.url;
      }}
    />
  );
}