export type AdminPage = {
  id: number;
  club: number;
  club_name: string;
  title: string;
  slug: string;
  menu_title: string;
  page_type: string;
  is_homepage: boolean;
  is_published: boolean;
  show_in_header: boolean;
  show_in_footer: boolean;
  navigation_order: number;
  menu_group: string;
  menu_group_title: string;
  team_category: number | null;
  team_category_name?: string | null;
  team_category_slug?: string | null;
  public_path: string;
  meta_title: string;
  meta_description: string;
  og_image: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPagePayload = {
  title: string;
  slug: string;
  page_type: string;
  is_homepage: boolean;
  is_published: boolean;
  menu_title: string;
  show_in_header: boolean;
  show_in_footer: boolean;
  menu_group: string;
  menu_group_title: string;
  team_category: number | null;
  navigation_order: number;
  meta_title: string;
  meta_description: string;
};

export type CreateAdminPagePayload = AdminPagePayload & {
  club: number;
};

export type AdminTeamCategory = {
  id: number;
  name: string;
  slug: string;
  club: number;
  club_name: string;
  season: string;
  category_subname: string;
  order: number;
  is_active: boolean;
};

export type AdminPageSection = {
  id: number;
  page: number;
  section_type: string;
  title: string;
  pre_title: string;
  order: number;
  is_active: boolean;
  hide_when_empty: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PageSectionReorderItem = {
  id: number;
  order: number;
};

export type SectionOption = {
  value: string;
  label: string;
};

export type SectionOptionsResponse = {
  page_type: string;
  items: SectionOption[];
};

export type CreatePageSectionPayload = {
  page: number;
  section_type: string;
  pre_title: string;
  title: string;
  order: number;
  is_active: boolean;
  hide_when_empty: boolean;
};

export type UpdatePageSectionPayload = {
  pre_title: string;
  title: string;
  is_active: boolean;
  hide_when_empty: boolean;
};
