export type PostCategory = {
  id: number;
  name: string;
  slug: string;
};

export type AdminPost = {
  id: number;
  club: number;
  club_name: string;
  club_slug: string;
  category: number | null;
  category_name: string | null;
  category_detail?: PostCategory | null;
  author: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  featured_image_url?: string | null;
  status: string;
  published_at: string | null;
  meta_title: string;
  meta_description: string;
  is_featured: boolean;
  external_source: string;
  external_id: string;
  source_url: string;
  created_at: string;
  updated_at: string;
};

export type PostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  featured_image_path: string | null;
  status: string;
  meta_title: string;
  meta_description: string;
  is_featured: boolean;
  category: number | null;
};