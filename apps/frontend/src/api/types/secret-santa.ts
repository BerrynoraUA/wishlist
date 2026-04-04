export type UUID = string;

export type CreateSecretSantaEventInput = {
  name: string;
  event_date: string;
  budget: number;
  image?: File | null;
  imageUrl?: string | null;
  invited_user_ids: UUID[];
};

export type UpdateSecretSantaEventInput = {
  name?: string;
  budget?: number;
  image?: File | null;
  imageUrl?: string | null;
  removeImage?: boolean;
};

export type SecretSantaEvent = {
  id: UUID;
  name: string;
  event_date: string;
  budget: number;
  image_url: string | null;
  owner_id: UUID | null;
};

export type SecretSantaPerson = {
  id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type SecretSantaPendingInvite = SecretSantaPerson & {
  invite_id: string;
};

export type SecretSantaDetails = {
  id: string;
  name: string;
  event_date: string;
  budget: number;
  image_url: string | null;
  owner_id: string | null;
  is_started: boolean;
  participants: SecretSantaPerson[];
  pending_invites: SecretSantaPendingInvite[];
  my_receiver: SecretSantaPerson | null;
};

export type SecretSantaListItem = {
  id: string;
  name: string;
  event_date: string;
  budget: number;
  image_url: string | null;
  owner_id: string | null;
  is_owner: boolean;
  participants_count: number;
};

export type SecretSantaListResponse = {
  items: SecretSantaListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ListSecretSantaEventsParams = {
  search?: string;
  limit?: number;
  offset?: number;
};

export type SecretSantaExclusion = {
  user_id: string;
  excluded_ids: string[];
};

export type LaunchSecretSantaInput = {
  event_id: string;
  exclusions: SecretSantaExclusion[];
};

export type VisibleItem = {
  id: string;
  wishlist_id: string;
  wishlist_title: string;
  wishlist_image_url: string | null;
  name: string;
  description: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean | null;
  effective_price: number | null;
  discount_end_date: string | null;
  currency: string | null;
  priority: number | null;
  url: string | null;
  image_url: string | null;
  status: number | null;
  reserved_by: string | null;
  created_at: string;
};

export type VisibleItemsResponse = {
  items: VisibleItem[];
  total: number;
  limit: number;
  offset: number;
};
