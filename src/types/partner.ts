export type PartnerTier =
  | ""
  | "general"
  | "main"
  | "partner"
  | "media";

export type AdminPartner = {
  id: number;
  club: number;
  club_name: string;
  name: string;
  logo: string | null;
  logo_url: string;
  image_url: string;
  website: string;
  tier: PartnerTier;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminPartnerPayload = {
  club: number;
  name: string;
  logo?: File | null;
  logo_url?: string;
  website?: string;
  tier: PartnerTier;
  is_active: boolean;
};

export type PartnerTierOption = {
  value: PartnerTier;
  label: string;
};

export type MovePartnerDirection = "up" | "down";
