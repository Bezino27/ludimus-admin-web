export type ClubInfoClub = {
  id: number;
  name: string;
  slug: string;
  short_name?: string;
};

export type ContactInfo = {
  id: number;
  club_name: string;
  club_slug: string;
  address: string;
  chairman_name: string;
  email: string;
  phone: string;
  iban: string;
  map_label: string;
  map_address: string;
  latitude: string;
  longitude: string;
  note: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ContactInfoPayload = {
  address: string;
  chairman_name: string;
  email: string;
  phone: string;
  iban: string;
  map_label: string;
  map_address: string;
  latitude: string;
  longitude: string;
  note: string;
  is_active: boolean;
};

export type ClubDocument = {
  id: number;
  title: string;
  file: string | null;
  file_url: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClubDocumentPayload = {
  title: string;
  order: number;
  is_active: boolean;
  file?: File | null;
};

export type ClubLink = {
  id: number;
  title: string;
  url: string;
  icon_type: string;
  logo: string | null;
  logo_url: string | null;
  order: number;
  is_active: boolean;
};

export type ClubLinkPayload = {
  title: string;
  url: string;
  icon_type: string;
  order: number;
  is_active: boolean;
  logo?: File | null;
};

export type ClubInfoOverview = {
  club: ClubInfoClub;
  contact: ContactInfo | null;
  documents: ClubDocument[];
  links: ClubLink[];
};
