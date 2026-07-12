import api from "./axios";
import { ADMIN_API_PREFIX } from "./config";
import type {
  AdminClubSeason,
  AdminPage,
  AdminPagePayload,
  AdminPageSection,
  AdminPageSectionContactItem,
  AdminPageSectionItem,
  AdminTeamCategory,
  AdminTeamCategoryPayload,
  CreateAdminPagePayload,
  CreatePageSectionContactItemPayload,
  CreatePageSectionItemPayload,
  CreatePageSectionPayload,
  PageSectionItemReorderItem,
  PageSectionReorderItem,
  SectionOptionsResponse,
  UpdateAdminClubSeasonPayload,
  UpdatePageSectionContactItemPayload,
  UpdatePageSectionItemPayload,
  UpdatePageSectionPayload,
} from "../types/page";

type PaginatedPagesResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPage[];
};

type PaginatedSectionsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPageSection[];
};

type PaginatedSectionItemsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPageSectionItem[];
};

type PaginatedContactItemsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPageSectionContactItem[];
};

function normalizeList<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function hasFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function buildSectionFormData(payload: UpdatePageSectionPayload) {
  const formData = new FormData();

  if (payload.section_type) {
    formData.append("section_type", payload.section_type);
  }

  formData.append("pre_title", payload.pre_title);
  formData.append("title", payload.title);
  formData.append("content", payload.content ?? "");
  formData.append("url", payload.url ?? "");
  formData.append("is_active", String(payload.is_active));
  formData.append("hide_when_empty", String(payload.hide_when_empty));

  if (hasFile(payload.image)) formData.append("image", payload.image);
  if (hasFile(payload.file)) formData.append("file", payload.file);

  return formData;
}

function buildSectionItemFormData(
  payload: CreatePageSectionItemPayload | UpdatePageSectionItemPayload
) {
  const formData = new FormData();

  if ("section" in payload) {
    formData.append("section", String(payload.section));
  }

  formData.append("title", payload.title);
  formData.append("url", payload.url ?? "");
  formData.append("order", String(payload.order));
  formData.append("is_active", String(payload.is_active));

  if (hasFile(payload.file)) {
    formData.append("file", payload.file);
  }

  return formData;
}

function buildCategoryFormData(payload: AdminTeamCategoryPayload) {
  const formData = new FormData();

  formData.append("club", String(payload.club));
  formData.append("name", payload.name);
  formData.append("slug", payload.slug);
  formData.append("season", payload.season);
  formData.append("birth_year_from", String(payload.birth_year_from));
  formData.append("birth_year_to", String(payload.birth_year_to));
  formData.append("category_subname", payload.category_subname);
  formData.append("league_name", payload.league_name);
  formData.append("coach_name", payload.coach_name);
  formData.append("coach_email", payload.coach_email);
  formData.append("coach_phone", payload.coach_phone);
  formData.append("order", String(payload.order));
  formData.append("is_active", String(payload.is_active));
  formData.append(
    "szfb_team_watch",
    payload.szfb_team_watch ? String(payload.szfb_team_watch) : ""
  );

  if (hasFile(payload.hero_image)) {
    formData.append("hero_image", payload.hero_image);
  }

  return formData;
}

export const getPages = async (): Promise<AdminPage[]> => {
  const response = await api.get<AdminPage[] | PaginatedPagesResponse>(
    `${ADMIN_API_PREFIX}/pages/`
  );

  return normalizeList(response.data);
};

export const getPage = async (id: number | string): Promise<AdminPage> => {
  const response = await api.get<AdminPage>(`${ADMIN_API_PREFIX}/pages/${id}/`);
  return response.data;
};

export const getTeamCategories = async (): Promise<AdminTeamCategory[]> => {
  const response = await api.get<
    AdminTeamCategory[] | { results?: AdminTeamCategory[] }
  >(`${ADMIN_API_PREFIX}/teams/categories/`);

  return normalizeList(response.data);
};

export const getTeamCategoriesByClub = async (
  clubSlug: string,
  season?: string
): Promise<AdminTeamCategory[]> => {
  const params = new URLSearchParams();

  params.set("club", clubSlug);

  if (season) {
    params.set("season", season);
  }

  const response = await api.get<
    AdminTeamCategory[] | { results?: AdminTeamCategory[] }
  >(`${ADMIN_API_PREFIX}/teams/categories/?${params.toString()}`);

  return normalizeList(response.data);
};

export const createTeamCategory = async (
  payload: AdminTeamCategoryPayload
): Promise<AdminTeamCategory> => {
  if (hasFile(payload.hero_image)) {
    const response = await api.post<AdminTeamCategory>(
      `${ADMIN_API_PREFIX}/teams/categories/`,
      buildCategoryFormData(payload)
    );

    return response.data;
  }

  const response = await api.post<AdminTeamCategory>(
    `${ADMIN_API_PREFIX}/teams/categories/`,
    {
      ...payload,
      hero_image: undefined,
    }
  );

  return response.data;
};

export const updateTeamCategory = async (
  id: number | string,
  payload: AdminTeamCategoryPayload
): Promise<AdminTeamCategory> => {
  if (hasFile(payload.hero_image)) {
    const response = await api.patch<AdminTeamCategory>(
      `${ADMIN_API_PREFIX}/teams/categories/${id}/`,
      buildCategoryFormData(payload)
    );

    return response.data;
  }

  const response = await api.patch<AdminTeamCategory>(
    `${ADMIN_API_PREFIX}/teams/categories/${id}/`,
    {
      ...payload,
      hero_image: undefined,
    }
  );

  return response.data;
};

export const deleteTeamCategory = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/teams/categories/${id}/`);
};

export const getCurrentClubSeason = async (
  clubSlug: string
): Promise<AdminClubSeason> => {
  const response = await api.get<AdminClubSeason>(
    `${ADMIN_API_PREFIX}/teams/club-seasons/current/?club=${encodeURIComponent(
      clubSlug
    )}`
  );

  return response.data;
};

export const updateCurrentClubSeason = async (
  clubSlug: string,
  payload: UpdateAdminClubSeasonPayload
): Promise<AdminClubSeason> => {
  const response = await api.patch<AdminClubSeason>(
    `${ADMIN_API_PREFIX}/teams/club-seasons/current/?club=${encodeURIComponent(
      clubSlug
    )}`,
    payload
  );

  return response.data;
};

export const createPage = async (
  payload: CreateAdminPagePayload
): Promise<AdminPage> => {
  const response = await api.post<AdminPage>(
    `${ADMIN_API_PREFIX}/pages/`,
    payload
  );
  return response.data;
};

export const updatePage = async (
  id: number | string,
  payload: AdminPagePayload
): Promise<AdminPage> => {
  const response = await api.patch<AdminPage>(
    `${ADMIN_API_PREFIX}/pages/${id}/`,
    payload
  );
  return response.data;
};

export const deletePage = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/pages/${id}/`);
};

export const getPageSections = async (
  pageId: number | string
): Promise<AdminPageSection[]> => {
  const response = await api.get<AdminPageSection[] | PaginatedSectionsResponse>(
    `${ADMIN_API_PREFIX}/pages/sections/?page=${pageId}`
  );

  return normalizeList(response.data).sort((a, b) => a.order - b.order);
};

export const getPageSectionOptions = async (
  pageId: number | string
): Promise<SectionOptionsResponse> => {
  const response = await api.get<SectionOptionsResponse>(
    `${ADMIN_API_PREFIX}/pages/section-options/?page=${pageId}`
  );
  return response.data;
};

export const createPageSection = async (
  payload: CreatePageSectionPayload
): Promise<AdminPageSection> => {
  const response = await api.post<AdminPageSection>(
    `${ADMIN_API_PREFIX}/pages/sections/`,
    payload
  );
  return response.data;
};

export const updatePageSection = async (
  id: number | string,
  payload: UpdatePageSectionPayload
): Promise<AdminPageSection> => {
  const hasUpload = hasFile(payload.image) || hasFile(payload.file);

  if (hasUpload) {
    const response = await api.patch<AdminPageSection>(
      `${ADMIN_API_PREFIX}/pages/sections/${id}/`,
      buildSectionFormData(payload)
    );
    return response.data;
  }

  const response = await api.patch<AdminPageSection>(
    `${ADMIN_API_PREFIX}/pages/sections/${id}/`,
    {
      section_type: payload.section_type,
      pre_title: payload.pre_title,
      title: payload.title,
      content: payload.content ?? "",
      url: payload.url ?? "",
      is_active: payload.is_active,
      hide_when_empty: payload.hide_when_empty,
    }
  );

  return response.data;
};

export const deletePageSection = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/pages/sections/${id}/`);
};

export const reorderPageSections = async (
  items: PageSectionReorderItem[]
): Promise<AdminPageSection[]> => {
  const response = await api.patch<AdminPageSection[] | PaginatedSectionsResponse>(
    `${ADMIN_API_PREFIX}/pages/sections/reorder/`,
    { items }
  );

  return normalizeList(response.data).sort((a, b) => a.order - b.order);
};

export const getPageSectionItems = async (
  sectionId: number | string
): Promise<AdminPageSectionItem[]> => {
  const response = await api.get<
    AdminPageSectionItem[] | PaginatedSectionItemsResponse
  >(`${ADMIN_API_PREFIX}/pages/section-items/?section=${sectionId}`);

  return normalizeList(response.data).sort((a, b) => a.order - b.order);
};

export const createPageSectionItem = async (
  payload: CreatePageSectionItemPayload
): Promise<AdminPageSectionItem> => {
  if (hasFile(payload.file)) {
    const response = await api.post<AdminPageSectionItem>(
      `${ADMIN_API_PREFIX}/pages/section-items/`,
      buildSectionItemFormData(payload)
    );
    return response.data;
  }

  const response = await api.post<AdminPageSectionItem>(
    `${ADMIN_API_PREFIX}/pages/section-items/`,
    payload
  );
  return response.data;
};

export const updatePageSectionItem = async (
  id: number | string,
  payload: UpdatePageSectionItemPayload
): Promise<AdminPageSectionItem> => {
  if (hasFile(payload.file)) {
    const response = await api.patch<AdminPageSectionItem>(
      `${ADMIN_API_PREFIX}/pages/section-items/${id}/`,
      buildSectionItemFormData(payload)
    );
    return response.data;
  }

  const response = await api.patch<AdminPageSectionItem>(
    `${ADMIN_API_PREFIX}/pages/section-items/${id}/`,
    {
      title: payload.title,
      url: payload.url ?? "",
      order: payload.order,
      is_active: payload.is_active,
    }
  );

  return response.data;
};

export const deletePageSectionItem = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/pages/section-items/${id}/`);
};

export const reorderPageSectionItems = async (
  items: PageSectionItemReorderItem[]
): Promise<AdminPageSectionItem[]> => {
  const response = await api.patch<
    AdminPageSectionItem[] | PaginatedSectionItemsResponse
  >(`${ADMIN_API_PREFIX}/pages/section-items/reorder/`, { items });

  return normalizeList(response.data).sort((a, b) => a.order - b.order);
};

export const getPageSectionContactItems = async (
  sectionId: number | string
): Promise<AdminPageSectionContactItem[]> => {
  const response = await api.get<
    AdminPageSectionContactItem[] | PaginatedContactItemsResponse
  >(`${ADMIN_API_PREFIX}/pages/section-contact-items/?section=${sectionId}`);

  return normalizeList(response.data).sort((a, b) => a.order - b.order);
};

export const createPageSectionContactItem = async (
  payload: CreatePageSectionContactItemPayload
): Promise<AdminPageSectionContactItem> => {
  const response = await api.post<AdminPageSectionContactItem>(
    `${ADMIN_API_PREFIX}/pages/section-contact-items/`,
    payload
  );
  return response.data;
};

export const updatePageSectionContactItem = async (
  id: number | string,
  payload: UpdatePageSectionContactItemPayload
): Promise<AdminPageSectionContactItem> => {
  const response = await api.patch<AdminPageSectionContactItem>(
    `${ADMIN_API_PREFIX}/pages/section-contact-items/${id}/`,
    payload
  );
  return response.data;
};

export const deletePageSectionContactItem = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/pages/section-contact-items/${id}/`);
};
