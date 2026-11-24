/**
 * Equivalente móvil de "descargar archivo" de la web: escribe el texto en la
 * caché y abre la hoja de compartir del sistema (desde ahí se abre con
 * Calendario, se guarda en Archivos, se manda por WhatsApp, etc.).
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareTextFile(
  filename: string,
  content: string,
  options: { mimeType: string; UTI?: string; dialogTitle?: string }
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: options.mimeType,
    UTI: options.UTI,
    dialogTitle: options.dialogTitle,
  });
}
