/**
 * Propuestas (T29): tipos y llamadas a la API. Mismos endpoints que la web
 * (apps/web/src/app/api/proposals-v2/*).
 *
 * Sin votos ni comentarios: la web tampoco los tiene (se quitaron con /t29).
 * Cerrar y reabrir la votación sí queda, igual que en la web.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { apiFetch } from '@/lib/api';

export type ProposalAuthor = {
  id?: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type Proposal = {
  id: number;
  title: string;
  objective: string;
  situation: string;
  proposal: string;
  imageUrl?: string | null;
  isActive?: boolean;
  votingClosed?: boolean;
  createdAt: string;
  createdBy?: ProposalAuthor | null;
};

export type ProposalInput = {
  title: string;
  objective: string;
  situation: string;
  proposal: string;
  imageUrl: string | null;
};

/** Límites del servidor (POST/PATCH /api/proposals-v2). */
export const PROPOSAL_LIMITS = {
  title: 200,
  objective: 1000,
  situation: 2000,
  proposal: 3000,
} as const;

export const proposalKeys = {
  public: '/api/proposals-v2/public',
  my: '/api/proposals-v2/my',
  admin: '/api/proposals-v2/admin?includeInactive=true',
} as const;

export type ProposalsResponse = { proposals: Proposal[] };

export function saveProposal(input: ProposalInput, id?: number) {
  return apiFetch<{ proposal: Proposal }>(id ? `/api/proposals-v2/${id}` : '/api/proposals-v2', {
    method: id ? 'PATCH' : 'POST',
    json: input,
  });
}

export function getProposal(id: number) {
  return apiFetch<{ proposal: Proposal }>(`/api/proposals-v2/${id}`);
}

/** La web usa PUT (CLAUDE.md dice PATCH, pero la ruta solo exporta PUT). */
export function toggleProposal(id: number) {
  return apiFetch<{ message: string }>(`/api/proposals-v2/${id}/toggle`, { method: 'PUT' });
}

/** PATCH cierra, PUT reabre. Solo Comisión. */
export function setVotingClosed(id: number, closed: boolean) {
  return apiFetch<{ message: string }>(`/api/proposals-v2/${id}/close-voting`, {
    method: closed ? 'PATCH' : 'PUT',
  });
}

export function deleteProposal(id: number) {
  return apiFetch<{ message: string }>(`/api/proposals-v2/${id}`, { method: 'DELETE' });
}

/**
 * La imagen se reduce en el teléfono (800 px de ancho, JPEG al 60 %) y se sube
 * a POST /api/uploads/proposal-image (Vercel Blob). Se guarda la URL https
 * que devuelve, como en la web. El servidor acepta hasta 1 MB.
 */
const MAX_IMAGE_WIDTH = 800;

/** El servidor solo acepta https; tampoco se muestra otra cosa. */
export function safeImageUri(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  return /^https:\/\/\S+$/i.test(value) ? value : null;
}

export type PickedImage = { uri: string } | { error: string } | null;

export async function uploadProposalImage(fileUri: string): Promise<string> {
  const body = new FormData();
  // React Native: un archivo local se adjunta como { uri, name, type }.
  body.append('file', { uri: fileUri, name: 'propuesta.jpg', type: 'image/jpeg' } as unknown as Blob);
  const { url } = await apiFetch<{ url: string }>('/api/uploads/proposal-image', { method: 'POST', body });
  return url;
}

export async function pickProposalImage(): Promise<PickedImage> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Necesitamos acceso a tus fotos para adjuntar una imagen.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
    return { error: 'El archivo elegido no es una imagen.' };
  }

  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_IMAGE_WIDTH) context.resize({ width: MAX_IMAGE_WIDTH });
  const ref = await context.renderAsync();
  const saved = await ref.saveAsync({
    compress: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  try {
    return { uri: await uploadProposalImage(saved.uri) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo subir la imagen.' };
  }
}

export function formatProposalDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
