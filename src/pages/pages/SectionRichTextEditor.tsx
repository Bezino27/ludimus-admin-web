import AdminRichTextEditor from "../../components/editor/AdminRichTextEditor";
import { uploadPostImage } from "../../api/uploads";
import { useAuth } from "../../context/useAuth";

type SectionRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type MembershipWithClubId = {
  is_active?: boolean;
  club_id?: number;
  club?: {
    id?: number;
  };
};

export default function SectionRichTextEditor({
  value,
  onChange,
}: SectionRichTextEditorProps) {
  const { user } = useAuth();

  const memberships = (user?.memberships || []) as MembershipWithClubId[];
  const activeMembership =
    memberships.find((membership) => membership.is_active) ?? memberships[0];

  const clubId = activeMembership?.club_id ?? activeMembership?.club?.id;

  const handleUploadImage = async (file: File) => {
    if (!clubId) {
      throw new Error("Chýba aktívny klub pre upload obrázka.");
    }

    const result = await uploadPostImage(clubId, file);
    return result.url;
  };

  return (
    <AdminRichTextEditor
      value={value}
      onChange={onChange}
      placeholder="Napíš obsah sekcie..."
      minHeight={260}
      imageAltText=""
      onUploadImage={handleUploadImage}
    />
  );
}
