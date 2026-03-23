import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { createPost } from "../../api/posts";
import PostForm from "../../components/PostForm";
import AdminPage from "../../components/layout/AdminPage";
import AdminCard from "../../components/layout/AdminCard";
import { useAuth } from "../../context/useAuth";
import type { PostFormValues } from "../../types/post";

type ApiErrorResponse = {
  detail?: string;
  [key: string]: unknown;
};

type UserMembership = {
  club_id: number;
  club_name: string;
  club_slug: string;
};

export default function PostCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectedClub = (user?.memberships?.[0] as UserMembership | undefined) ?? null;

  const handleSubmit = async (values: PostFormValues) => {
    if (!selectedClub) {
      alert("Nie je dostupný klub.");
      return;
    }

    try {
      await createPost({
        club: selectedClub.club_id,
        category: values.category,
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        content: values.content,
        featured_image_path: values.featured_image_path,
        status: values.status,
        meta_title: values.meta_title,
        meta_description: values.meta_description,
        is_featured: values.is_featured,
      });

      navigate("/posts");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      console.error(
        "CREATE POST ERROR:",
        axiosError.response?.data || axiosError.message || error
      );

      alert(
        JSON.stringify(
          axiosError.response?.data || { detail: "Vytvorenie článku zlyhalo." },
          null,
          2
        )
      );
    }
  };

  if (!selectedClub) {
    return (
      <AdminPage title="Nový článok" subtitle="Nie je dostupný klub.">
        <AdminCard>Nie je dostupný klub.</AdminCard>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Nový článok"
      subtitle={`Vytvárate článok pre klub ${selectedClub.club_name}`}
    >
      <AdminCard>
        <PostForm
          onSubmit={handleSubmit}
          submitLabel="Vytvoriť článok"
          clubId={selectedClub.club_id}
          clubSlug={selectedClub.club_slug}
        />
      </AdminCard>
    </AdminPage>
  );
}