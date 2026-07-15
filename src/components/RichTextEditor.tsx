import { uploadPostImage } from "../api/uploads";
import AdminRichTextEditor from "./editor/AdminRichTextEditor";

type Props = {
  value: string;
  onChange: (html: string) => void;
  clubId: number;
  imageAltText?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  clubId,
  imageAltText,
}: Props) {
  return (
    <AdminRichTextEditor
      value={value}
      onChange={onChange}
      placeholder="Začni písať článok..."
      minHeight={320}
      imageAltText={imageAltText}
      onUploadImage={async (file) => {
        const result = await uploadPostImage(clubId, file);
        return result.url;
      }}
    />
  );
}
