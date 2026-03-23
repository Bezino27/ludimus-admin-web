export type Membership = {
  id: number;
  club_id: number;
  club_name: string;
  club_slug: string;
  role: string;
  is_active: boolean;
};

export type MeResponse = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  memberships: Membership[];
};

export type LoginResponse = {
  refresh: string;
  access: string;
};