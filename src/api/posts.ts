import api from "./axios";
import type { AdminPost, PostCategory } from "../types/post";

export type PostPayload = {
  club: number;
  category: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_path?: string | null;
  status: string;
  meta_title: string;
  meta_description: string;
  is_featured: boolean;
};

export type PaginatedPostsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPost[];
};

type GetPostsParams = {
  clubSlug?: string;
  page?: number;
};

export const getPosts = async ({
  clubSlug,
  page = 1,
}: GetPostsParams = {}): Promise<PaginatedPostsResponse> => {
  const params = new URLSearchParams();

  if (clubSlug) {
    params.set("club", clubSlug);
  }

  params.set("page", String(page));

  const query = params.toString();
  const response = await api.get<AdminPost[] | PaginatedPostsResponse>(
    `/api/admin/posts/${query ? `?${query}` : ""}`
  );

  const data = response.data;

  if (Array.isArray(data)) {
    const sorted = [...data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      count: sorted.length,
      next: null,
      previous: null,
      results: sorted,
    };
  }

  if (data && Array.isArray(data.results)) {
    return {
      ...data,
      results: [...data.results].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
};

export const getAdminPosts = async (
  clubSlug?: string,
  page = 1
): Promise<PaginatedPostsResponse> => {
  return getPosts({ clubSlug, page });
};

export const getPostDetail = async (id: string | number) => {
  const response = await api.get<AdminPost>(`/api/admin/posts/${id}/`);
  return response.data;
};

export const createPost = async (payload: PostPayload) => {
  const response = await api.post<AdminPost>("/api/admin/posts/", payload);
  return response.data;
};

export const updatePost = async (id: string | number, payload: PostPayload) => {
  const response = await api.put<AdminPost>(`/api/admin/posts/${id}/`, payload);
  return response.data;
};

export const deletePost = async (id: string | number) => {
  await api.delete(`/api/admin/posts/${id}/`);
};

export const getPostCategories = async (clubSlug: string) => {
  const response = await api.get<PostCategory[]>(
    `/api/admin/posts/categories/?club=${clubSlug}`
  );
  return response.data;
};