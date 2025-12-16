import { apiFetchBlob, apiFetchJson } from './http';
import type { PendingReviewReleaseRow, PendingReviewTrackRow, ReleaseRow, TrackRow } from './types';

export async function login(params: { email: string; password: string }): Promise<{ token: string }> {
  return apiFetchJson({
    path: '/auth/login',
    method: 'POST',
    body: params
  });
}

export async function listReleases(token: string): Promise<ReleaseRow[]> {
  return apiFetchJson({ path: '/releases', token });
}

export async function getRelease(token: string, releaseId: string): Promise<ReleaseRow> {
  return apiFetchJson({ path: `/releases/${releaseId}`, token });
}

export async function createRelease(
  token: string,
  params: { title: string; genre: string }
): Promise<ReleaseRow> {
  return apiFetchJson({ path: '/releases', method: 'POST', token, body: params });
}

export async function updateRelease(
  token: string,
  releaseId: string,
  params: { title: string; genre: string }
): Promise<{ ok: true }> {
  return apiFetchJson({ path: `/releases/${releaseId}`, method: 'PATCH', token, body: params });
}

export async function submitRelease(token: string, releaseId: string): Promise<{ ok: true; state: string }> {
  return apiFetchJson({ path: `/releases/${releaseId}/submit`, method: 'POST', token });
}

export async function listTracks(token: string, releaseId: string): Promise<TrackRow[]> {
  return apiFetchJson({ path: `/releases/${releaseId}/tracks`, token });
}

export async function createTrack(
  token: string,
  releaseId: string,
  params: { title: string; isrc: string; duration?: number }
): Promise<TrackRow> {
  return apiFetchJson({ path: `/releases/${releaseId}/tracks`, method: 'POST', token, body: params });
}

export async function listPendingReviewReleases(token: string): Promise<PendingReviewReleaseRow[]> {
  return apiFetchJson({ path: '/admin/releases/pending-review', token });
}

export async function listPendingReviewReleaseTracks(
  token: string,
  releaseId: string
): Promise<PendingReviewTrackRow[]> {
  return apiFetchJson({ path: `/admin/releases/${releaseId}/tracks`, token });
}

export async function approvePendingReviewRelease(token: string, releaseId: string): Promise<{ ok: true }> {
  return apiFetchJson({ path: `/admin/releases/${releaseId}/approve`, method: 'POST', token });
}

export async function rejectPendingReviewRelease(token: string, releaseId: string): Promise<{ ok: true }> {
  return apiFetchJson({ path: `/admin/releases/${releaseId}/reject`, method: 'POST', token });
}

export async function fetchPendingReviewTrackAudioBlob(token: string, trackId: string): Promise<Blob> {
  return apiFetchBlob({ path: `/admin/tracks/${trackId}/audio`, token });
}
