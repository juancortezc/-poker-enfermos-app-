/**
 * Propuestas (T29): tipos y llamadas a la API. Mismos endpoints que la web
 * (apps/web/src/app/api/proposals-v2/*).
 *
 * Votos y comentarios usan `/api/proposals/[id]/votes|comments`, el contrato
 * documentado en CLAUDE.md. Esos dos endpoints se borraron de la web en
 * c039e54 junto con la página /t29; hasta que Backend los restaure responden
 * 404 y la UI lo muestra como "no disponible" en vez de fallar.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { apiFetch } from '@/lib/api';
import type { VoteType } from '@poker/shared';

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
  comment: 500,
} as const;

export const proposalKeys = {
  public: '/api/proposals-v2/public',
  my: '/api/proposals-v2/my',
  admin: '/api/proposals-v2/admin?includeInactive=true',
  votes: (id: number) => `/api/proposals/${id}/votes`,
  comments: (id: number) => `/api/proposals/${id}/comments`,
} as const;

export type ProposalsResponse = { proposals: Proposal[] };

export type VoteStats = { thumbsUp: number; thumbsDown: number; total: number };
export type VotesResponse = {
  votes: { id: number; voteType: VoteType; player: { id: string } }[];
  stats: VoteStats;
};

export type ProposalComment = {
  id: number;
  content: string;
  createdAt: string;
  player: ProposalAuthor & { id: string };
};
export type CommentsResponse = { comments: ProposalComment[] };

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

export function castVote(id: number, voteType: VoteType) {
  return apiFetch<{ stats: VoteStats }>(proposalKeys.votes(id), { method: 'POST', json: { voteType } });
}

export function removeVote(id: number) {
  return apiFetch<{ stats: VoteStats }>(proposalKeys.votes(id), { method: 'DELETE' });
}

export function postComment(id: number, content: string) {
  return apiFetch<{ comment: ProposalComment }>(proposalKeys.comments(id), {
    method: 'POST',
    json: { content },
  });
}

/**
 * La web no sube archivos: guarda una URL de imagen (`imageUrl`) y el servidor
 * solo comprueba que sea una URL válida. No hay endpoint de subida, así que la
 * foto elegida se reduce a 800 px de ancho, JPEG al 50 %, y viaja como data
 * URI en ese mismo campo (la web la muestra igual con <img src>). Cada imagen
 * engorda la lista pública, de ahí el tope bajo. Si se crea un endpoint de
 * subida, solo cambia esta función.
 */
export const MAX_IMAGE_BYTES = 250 * 1024;
const MAX_IMAGE_WIDTH = 800;

/**
 * El servidor acepta cualquier URL (incluidas `javascript:` y
 * `data:text/html`). Solo se muestran http(s) y data:image.
 */
export function safeImageUri(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  return /^(https?:\/\/\S+|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value) ? value : null;
}

export type PickedImage = { uri: string } | { error: string } | null;

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
    base64: true,
    compress: 0.5,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  if (!saved.base64) return { error: 'No se pudo procesar la imagen.' };

  // base64 ocupa 4/3 del binario.
  if ((saved.base64.length * 3) / 4 > MAX_IMAGE_BYTES) {
    return { error: 'La imagen es demasiado grande incluso comprimida. Probá con otra o recortala.' };
  }
  return { uri: `data:image/jpeg;base64,${saved.base64}` };
}

export function formatProposalDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
