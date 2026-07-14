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
  is_deletable: boolean;
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
  club: number;
  club_name: string;
  name: string;
  slug: string;
  season: string;
  birth_year_from: number;
  birth_year_to: number;
  display_years: string;
  category_subname: string;
  league_name: string;
  hero_image: string | null;
  hero_image_url: string | null;
  coach_name: string;
  coach_email: string;
  coach_phone: string;
  order: number;
  is_active: boolean;
  szfb_team_watch: number | null;
  szfb_team_watch_id: number | null;
  szfb_team_watch_label: string | null;
  szfb_team_watch_competition_name: string | null;
  szfb_team_watch_competition_season: string | null;
  szfb_watch_id: number | null;
  szfb_watch_label: string | null;
  szfb_competition_name: string | null;
  created_at: string;
  updated_at: string;
  trainings: AdminCategoryTraining[];
  links: AdminCategoryLink[];
};

export type AdminTeamCategoryPayload = {
  club: number;
  name: string;
  slug: string;
  season: string;
  birth_year_from: number;
  birth_year_to: number;
  category_subname: string;
  league_name: string;
  hero_image?: File | null;
  coach_name: string;
  coach_email: string;
  coach_phone: string;
  order: number;
  is_active: boolean;
  szfb_team_watch: number | null;
};

export type AdminPageSection = {
  id: number;
  page: number;
  section_type: string;
  title: string;
  pre_title: string;
  content: string;
  image: string | null;
  image_url: string | null;
  url: string;
  file: string | null;
  file_url: string | null;
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
  section_type?: string;
  pre_title: string;
  title: string;
  content?: string;
  image?: File | null;
  url?: string;
  file?: File | null;
  is_active: boolean;
  hide_when_empty: boolean;
};

export type AdminPageSectionItem = {
  id: number;
  section: number;
  section_type: string;
  title: string;
  url: string;
  file: string | null;
  file_url: string | null;
  item_type: "document" | "link" | "item";
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatePageSectionItemPayload = {
  section: number;
  title: string;
  url?: string;
  file?: File | null;
  order: number;
  is_active: boolean;
};

export type UpdatePageSectionItemPayload = {
  title: string;
  url?: string;
  file?: File | null;
  order: number;
  is_active: boolean;
};

export type PageSectionItemReorderItem = {
  id: number;
  order: number;
};

export type AdminPageSectionContactItem = {
  id: number;
  section: number;
  contact_type: string;
  value: string;
  url: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatePageSectionContactItemPayload = {
  section: number;
  contact_type: string;
  value: string;
  url?: string;
  order: number;
  is_active: boolean;
};

export type UpdatePageSectionContactItemPayload = {
  contact_type: string;
  value: string;
  url?: string;
  order: number;
  is_active: boolean;
};

export type AdminClubSeason = {
  id: number;
  club: number;
  club_name: string;
  club_slug: string;
  season: string;
  available_seasons: string[];
  created_at: string;
  updated_at: string;
};

export type UpdateAdminClubSeasonPayload = {
  season: string;
  recalculate_categories?: boolean;
};

export type AdminTrainingLocation = {
  id: number;
  club: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminTrainingLocationPayload = {
  club: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  order: number;
  is_active: boolean;
};

export type AdminCategoryTraining = {
  id: number;
  category: number;
  location: number;
  location_name: string;
  location_address: string;
  latitude: number;
  longitude: number;
  weekday: number;
  day: string;
  start_time: string;
  time: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminCategoryTrainingPayload = {
  category: number;
  location: number;
  weekday: number;
  start_time: string;
  order: number;
  is_active: boolean;
};

export type AdminCategoryLink = {
  id: number;
  category: number;
  title: string;
  description: string;
  cta_text: string;
  url: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminCategoryLinkPayload = {
  category: number;
  title: string;
  description: string;
  cta_text: string;
  url: string;
  order: number;
  is_active: boolean;
};
