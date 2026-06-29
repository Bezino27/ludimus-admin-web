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
  const response = await api.post<Poll>(`${ADMIN_API_PREFIX}/polls/`, payload);
  return response.data;
};

export const updatePoll = async (
  id: number | string,
  payload: PollPayload
): Promise<Poll> => {
  const response = await api.put<Poll>(
    `${ADMIN_API_PREFIX}/polls/${id}/`,
    payload
  );
  return response.data;
};

export const deletePoll = async (id: number | string) => {
  await api.delete(`${ADMIN_API_PREFIX}/polls/${id}/`);
};
