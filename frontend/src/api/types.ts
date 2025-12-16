export type ReleaseStatus = 'DRAFT' | 'PROCESSING' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export type ReleaseRow = {
  id: string;
  artist_id: string;
  title: string;
  genre: string;
  status: ReleaseStatus;
  cover_art_object_key: string | null;
  cover_art_public_url: string | null;
  created_at: string;
};

export type TrackRow = {
  id: string;
  release_id: string;
  title: string;
  isrc: string;
  duration: number | null;
  audio_url: string | null;
  audio_object_key: string | null;
  audio_public_url: string | null;
  created_at: string;
};
