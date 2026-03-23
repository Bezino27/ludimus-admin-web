import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { getPostDetail, updatePost } from "../../api/posts";
import PostForm from "../../components/PostForm";
import AdminPage from "../../components/layout/AdminPage";
import AdminCard from "../../components/layout/AdminCard";
import type { AdminPost, PostFormValues } from "../../types/post";

type ApiErrorResponse = {
  detail?: string;
  [key: string]: unknown;
};

export default function PostEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<AdminPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      try {
        const data = await getPostDetail(id);
        setPost(data);
      } catch (error) {
        console.error("LOAD POST ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubmit = async (values: PostFormValues) => {
    if (!id || !post) return;

    try {
      await updatePost(id, {
        club: post.club,
        category: values.category ?? post.category,
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
        "UPDATE POST ERROR:",
        axiosError.response?.data || axiosError.message || error
      );

      alert(
        JSON.stringify(
          axiosError.response?.data || { detail: "Úprava článku zlyhala." },
          null,
          2
        )
      );
    }
  };

  if (loading) {
    return (
      <AdminPage title="Upraviť článok" subtitle="Načítavam článok...">
        <AdminCard>Načítavam článok...</AdminCard>
      </AdminPage>
    );
  }

  if (!post) {
    return (
      <AdminPage title="Upraviť článok" subtitle="Článok neexistuje.">
        <AdminCard>Článok neexistuje.</AdminCard>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Upraviť článok"
      subtitle={`Upravujete článok: ${post.title}`}
    >
      <AdminCard>
        <PostForm
          initialValues={{
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            featured_image: post.featured_image,
            featured_image_path: post.featured_image,
            status: post.status,
            meta_title: post.meta_title,
            meta_description: post.meta_description,
            is_featured: post.is_featured,
            category: post.category,
          }}
          onSubmit={handleSubmit}
          submitLabel="Uložiť zmeny"
          clubId={post.club}
          clubSlug={post.club_slug}
        />
      </AdminCard>
    </AdminPage>
  );
}