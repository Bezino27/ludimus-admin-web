import api from "./axios";
import { ADMIN_API_PREFIX } from "./config";
import type {
  AdminPage,
  AdminPagePayload,
  AdminPageSection,
  AdminTeamCategory,
  CreateAdminPagePayload,
  CreatePageSectionPayload,
  PageSectionReorderItem,
  SectionOptionsResponse,
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

function normalizeList<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  return [];
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
  const response = await api.get<AdminTeamCategory[] | { results?: AdminTeamCategory[] }>(
    `${ADMIN_API_PREFIX}/teams/categories/`
  );

  return normalizeList(response.data);
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
  const response = await api.get<
    AdminPageSection[] | PaginatedSectionsResponse
  >(`${ADMIN_API_PREFIX}/pages/sections/?page=${pageId}`);

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
  const response = await api.patch<AdminPageSection>(
    `${ADMIN_API_PREFIX}/pages/sections/${id}/`,
    payload
  );
  return response.data;
};

export const deletePageSection = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/pages/sections/${id}/`);
};

export const reorderPageSections = async (
  items: PageSectionReorderItem[]
): Promise<AdminPageSection[]> => {
  const response = await api.patch<
    AdminPageSection[] | PaginatedSectionsResponse
  >(`${ADMIN_API_PREFIX}/pages/sections/reorder/`, { items });

  return normalizeList(response.data).sort((a, b) => a.order - b.order);
};
