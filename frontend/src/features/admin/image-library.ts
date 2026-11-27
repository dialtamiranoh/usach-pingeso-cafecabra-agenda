export interface LibraryImage {
  id: string; nombre: string; url: string; peso: number; ancho: number; alto: number;
  estado: 'ACTIVA' | 'ELIMINANDO'; usos: { id: number; nombre: string }[];
}
export interface ImageList { items: LibraryImage[]; total: number; page: number; pageSize: number }
export async function listImages(page = 1, query = '', signal?: AbortSignal): Promise<ImageList> {
  const response = await fetch('/api/admin/imagenes?' + new URLSearchParams({ page: String(page), q: query }), { signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'No pudimos cargar la biblioteca.');
  return body;
}
export async function deleteImage(id: string) {
  const response = await fetch('/api/admin/imagenes/' + id, { method: 'DELETE' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'No pudimos eliminar la imagen.');
}
export async function optimizeImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Usa JPG, PNG o WebP.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('El archivo original debe pesar hasta 5 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('No pudimos leer la imagen. Comprueba que no esté dañada.'); }
  try {
    if (bitmap.width * bitmap.height > 32_000_000 || Math.max(bitmap.width, bitmap.height) > 10000)
      throw new Error('La imagen es demasiado grande. Usa una fotografía de hasta 32 megapíxeles y 10000 píxeles por lado.');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no permite preparar la imagen.');
    for (let attempt = 0; attempt < 10; attempt++) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', Math.max(.5, .84 - attempt * .07)));
      if (!blob || blob.type !== 'image/webp') throw new Error('Tu navegador no permite convertir a WebP. Prueba con Chrome o Edge.');
      if (blob.size <= 500 * 1024) return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
      if (attempt >= 3) { canvas.width = Math.max(1, Math.round(canvas.width * .8)); canvas.height = Math.max(1, Math.round(canvas.height * .8)); }
    }
    throw new Error('No pudimos reducir la imagen a 500 KB. Prueba con otra fotografía.');
  } finally { bitmap.close(); }
}
export function uploadImage(file: File, onProgress: (value: number) => void): Promise<LibraryImage> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/admin/imagenes');
    request.timeout = 45000;
    request.setRequestHeader('Content-Type', 'image/webp');
    request.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error('No se pudo conectar. Revisa la biblioteca antes de reintentar.'));
    request.ontimeout = () => reject(new Error('La carga tardó demasiado. Revisa si se guardó antes de reintentar.'));
    request.onload = () => {
      try { const body = JSON.parse(request.responseText); if (request.status >= 200 && request.status < 300) resolve(body); else reject(new Error(body.error ?? 'No pudimos subir la imagen.')); }
      catch { reject(new Error('No pudimos leer la respuesta del servidor.')); }
    };
    request.send(file);
  });
}
