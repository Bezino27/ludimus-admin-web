import api from "./axios";
import { ADMIN_API_PREFIX } from "./config";
import type {
  AdminPartner,
  AdminPartnerPayload,
  MovePartnerDirection,
  PartnerTierOption,
} from "../types/partner";

type PaginatedPartnersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminPartner[];
};

function normalizeList(
  data: AdminPartner[] | PaginatedPartnersResponse
): AdminPartner[] {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data.results) ? data.results : [];
}

function hasFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function buildPartnerFormData(payload: AdminPartnerPayload) {
  const formData = new FormData();

  formData.append("club", String(payload.club));
  formData.append("name", payload.name.trim());
  formData.append("logo_url", payload.logo_url?.trim() || "");
  formData.append("website", payload.website?.trim() || "");
  formData.append("tier", payload.tier);
  formData.append("is_active", String(payload.is_active));

  if (hasFile(payload.logo)) {
    formData.append("logo", payload.logo);
  }

  return formData;
}

export async function getAdminPartners(
  clubSlug?: string
): Promise<AdminPartner[]> {
  const response = await api.get<
    AdminPartner[] | PaginatedPartnersResponse
  >(`${ADMIN_API_PREFIX}/partners/`, {
    params: clubSlug ? { club: clubSlug } : undefined,
  });

  return normalizeList(response.data);
}

export async function getPartnerTierOptions(): Promise<PartnerTierOption[]> {
  const response = await api.get<PartnerTierOption[]>(
    `${ADMIN_API_PREFIX}/partners/tiers/`
  );

  return response.data;
}

export async function createAdminPartner(
  payload: AdminPartnerPayload
): Promise<AdminPartner> {
  const response = await api.post<AdminPartner>(
    `${ADMIN_API_PREFIX}/partners/`,
    buildPartnerFormData(payload)
  );

  return response.data;
}

export async function updateAdminPartner(
  id: number,
  payload: AdminPartnerPayload
): Promise<AdminPartner> {
  const requestBody = hasFile(payload.logo)
    ? buildPartnerFormData(payload)
    : {
        club: payload.club,
        name: payload.name.trim(),
        logo_url: payload.logo_url?.trim() || "",
        website: payload.website?.trim() || "",
        tier: payload.tier,
        is_active: payload.is_active,
      };

  const response = await api.patch<AdminPartner>(
    `${ADMIN_API_PREFIX}/partners/${id}/`,
    requestBody
  );

  return response.data;
}

export async function deleteAdminPartner(id: number): Promise<void> {
  await api.delete(`${ADMIN_API_PREFIX}/partners/${id}/`);
}

export async function moveAdminPartner(
  id: number,
  direction: MovePartnerDirection
): Promise<AdminPartner[]> {
  const response = await api.post<
    AdminPartner[] | PaginatedPartnersResponse
  >(`${ADMIN_API_PREFIX}/partners/${id}/move/`, {
    direction,
  });

  return normalizeList(response.data);
}

export async function patchAdminPartner(
  id: number,
  payload: Partial<Pick<AdminPartner, "tier" | "is_active">>
): Promise<AdminPartner> {
  const response = await api.patch<AdminPartner>(
    `${ADMIN_API_PREFIX}/partners/${id}/`,
    payload
  );

  return response.data;
}
