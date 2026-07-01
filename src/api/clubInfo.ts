import api from "./axios";
import { ADMIN_API_PREFIX } from "./config";
import type {
  ClubDocument,
  ClubDocumentPayload,
  ClubInfoOverview,
  ClubLink,
  ClubLinkPayload,
  ContactInfo,
  ContactInfoPayload,
} from "../types/clubInfo";

const BASE_URL = `${ADMIN_API_PREFIX}/club-info`;

export async function getClubInfoOverview() {
  const response = await api.get<ClubInfoOverview>(`${BASE_URL}/overview/`);
  return response.data;
}

export async function getContactInfo() {
  const response = await api.get<ContactInfo | null>(`${BASE_URL}/contact/`);
  return response.data;
}

export async function saveContactInfo(payload: ContactInfoPayload) {
  const response = await api.put<ContactInfo>(`${BASE_URL}/contact/`, payload);
  return response.data;
}

export async function getClubDocuments() {
  const response = await api.get<ClubDocument[]>(`${BASE_URL}/documents/`);
  return response.data;
}

export async function createClubDocument(payload: ClubDocumentPayload) {
  const formData = buildDocumentFormData(payload);
  const response = await api.post<ClubDocument>(`${BASE_URL}/documents/`, formData);
  return response.data;
}

export async function updateClubDocument(id: number, payload: ClubDocumentPayload) {
  const formData = buildDocumentFormData(payload);
  const response = await api.patch<ClubDocument>(`${BASE_URL}/documents/${id}/`, formData);
  return response.data;
}

export async function deleteClubDocument(id: number) {
  await api.delete(`${BASE_URL}/documents/${id}/`);
}

export async function getClubLinks() {
  const response = await api.get<ClubLink[]>(`${BASE_URL}/links/`);
  return response.data;
}

export async function createClubLink(payload: ClubLinkPayload) {
  const formData = buildLinkFormData(payload);
  const response = await api.post<ClubLink>(`${BASE_URL}/links/`, formData);
  return response.data;
}

export async function updateClubLink(id: number, payload: ClubLinkPayload) {
  const formData = buildLinkFormData(payload);
  const response = await api.patch<ClubLink>(`${BASE_URL}/links/${id}/`, formData);
  return response.data;
}

export async function deleteClubLink(id: number) {
  await api.delete(`${BASE_URL}/links/${id}/`);
}

function buildDocumentFormData(payload: ClubDocumentPayload) {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("order", String(payload.order));
  formData.append("is_active", String(payload.is_active));

  if (payload.file) {
    formData.append("file", payload.file);
  }

  return formData;
}

function buildLinkFormData(payload: ClubLinkPayload) {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("url", payload.url);
  formData.append("icon_type", payload.icon_type);
  formData.append("order", String(payload.order));
  formData.append("is_active", String(payload.is_active));

  if (payload.logo) {
    formData.append("logo", payload.logo);
  }

  return formData;
}