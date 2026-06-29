export type PollOption = {
  id?: number;
  text: string;
  order: number;
  votes_count?: number;
};

export type Poll = {
  id: number;
  club: number | null;
  club_slug?: string | null;
  club_name?: string | null;
  question: string;
  description: string;
  is_active: boolean;
  voting_open?: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  options: PollOption[];
  total_votes?: number;
};

export type PollPayload = {
  club: number;
  question: string;
  description?: string;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  options: PollOption[];
};

export type PollFormValues = {
  question: string;
  description: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  options: PollOption[];
};
