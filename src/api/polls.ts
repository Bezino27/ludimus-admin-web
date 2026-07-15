import api from "./axios";
import { ADMIN_API_PREFIX } from "./config";
import type { Poll, PollPayload } from "../types/poll";

type PaginatedPollsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Poll[];
};

function normalizePollsResponse(data: Poll[] | PaginatedPollsResponse): Poll[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

function pollPayloadNeedsFormData(payload: PollPayload) {
  return payload.options.some(
    (option) => option.video_file_upload || option.remove_video_file
  );
}

function appendOptionalValue(
  formData: FormData,
  key: string,
  value: string | number | boolean | null | undefined
) {
  if (value === null || value === undefined) return;

  formData.append(key, String(value));
}

function buildPollFormData(payload: PollPayload) {
  const formData = new FormData();

  formData.append("club", String(payload.club));
  formData.append("question", payload.question);
  formData.append("description", payload.description ?? "");
  formData.append("is_active", String(payload.is_active));
  formData.append("starts_at", payload.starts_at ?? "");
  formData.append("ends_at", payload.ends_at ?? "");

  payload.options.forEach((option, index) => {
    appendOptionalValue(formData, `options[${index}][id]`, option.id);
    formData.append(`options[${index}][text]`, option.text);
    formData.append(`options[${index}][video_url]`, option.video_url ?? "");
    formData.append(`options[${index}][order]`, String(index));

    if (option.remove_video_file) {
      formData.append(`options[${index}][remove_video_file]`, "true");
    }

    if (option.video_file_upload) {
      formData.append(
        `options[${index}][video_file]`,
        option.video_file_upload
      );
    }
  });

  return formData;
}

function serializePollPayload(payload: PollPayload) {
  if (pollPayloadNeedsFormData(payload)) {
    return buildPollFormData(payload);
  }

  return payload;
}

export const getPolls = async (clubSlug?: string): Promise<Poll[]> => {
  const params = new URLSearchParams();

  if (clubSlug) {
    params.set("club", clubSlug);
  }

  const query = params.toString();
  const response = await api.get<Poll[] | PaginatedPollsResponse>(
    `${ADMIN_API_PREFIX}/polls/${query ? `?${query}` : ""}`
  );

  return normalizePollsResponse(response.data);
};

export const getPoll = async (id: number | string): Promise<Poll> => {
  const response = await api.get<Poll>(`${ADMIN_API_PREFIX}/polls/${id}/`);
  return response.data;
};

export const createPoll = async (payload: PollPayload): Promise<Poll> => {
  const response = await api.post<Poll>(
    `${ADMIN_API_PREFIX}/polls/`,
    serializePollPayload(payload)
  );
  return response.data;
};

export const updatePoll = async (
  id: number | string,
  payload: PollPayload
): Promise<Poll> => {
  const response = await api.put<Poll>(
    `${ADMIN_API_PREFIX}/polls/${id}/`,
    serializePollPayload(payload)
  );
  return response.data;
};

export const deletePoll = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/polls/${id}/`);
};
