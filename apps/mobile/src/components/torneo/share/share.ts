/**
 * Compartir desde la app:
 *
 * - `shareView`: captura una vista con react-native-view-shot (PNG) y abre el
 *   menú nativo de compartir. Para lo que la app dibuja (premios).
 * - `downloadWithAuth` + `shareFile`: baja un archivo de la API con la
 *   credencial (PNG de /api/share/*, XLSX de reportes) a la caché y lo
 *   comparte. Las imágenes del grupo las arma el servidor (lib/share-image.tsx
 *   de la web), así que la app comparte exactamente el mismo PNG que la web.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ApiError, apiUrl, getAuthHeaderValue } from '@/lib/api';

export async function shareView(ref: RefObject<ComponentRef<typeof View> | null>, dialogTitle: string): Promise<void> {
  if (!ref.current) return;
  const uri = await captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile' });
  await shareFile(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
}

export async function shareFile(uri: string, options: Sharing.SharingOptions): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }
  await Sharing.shareAsync(uri, options);
}

function shareDir(): Directory {
  const dir = new Directory(Paths.cache, 'compartir');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Descarga `path` de la API a la caché con el nombre `fileName`. Comprueba el
 * estado HTTP antes de escribir: downloadFileAsync guarda también el cuerpo de
 * un 4xx/5xx, y compartir un JSON de error como si fuera un PNG sería peor que
 * un aviso.
 */
export async function downloadWithAuth(path: string, fileName: string): Promise<File> {
  const auth = getAuthHeaderValue();
  const headers: Record<string, string> = auth ? { Authorization: auth } : {};

  const res = await fetch(apiUrl(path), { method: 'GET', headers });
  if (!res.ok) {
    const info = await res.text().catch(() => '');
    throw new ApiError(res.status, info);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());

  const file = new File(shareDir(), fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file;
}
