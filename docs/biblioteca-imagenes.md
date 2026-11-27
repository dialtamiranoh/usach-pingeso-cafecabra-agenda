# Biblioteca de imágenes

## Flujo de uso

En Mantenedores, la pestaña Biblioteca de imágenes permite cargar archivos mediante el botón Subir imágenes o arrastrándolos a la zona de carga. Se muestran progreso, errores por archivo, búsqueda, páginas, tamaño, dimensiones y las actividades que utilizan cada imagen.

Se aceptan JPG, PNG y WebP originales de hasta 5 MiB, con un máximo de diez archivos por carga. El navegador decodifica y convierte cada archivo a WebP estático, reduce su lado mayor a un máximo de 1600 píxeles y ajusta calidad y dimensiones hasta pesar como máximo 500 KiB. Mantiene la proporción, no amplía imágenes pequeñas ni guarda los originales. Para evitar decodificaciones excesivas, se rechazan imágenes de más de 32 megapíxeles o 10000 píxeles por lado.

La conversión usa Canvas y createImageBitmap del navegador. No requiere transformaciones remotas de Cloudflare Images. El backend vuelve a validar tamaño, MIME, contenedor WebP, dimensiones y ausencia de animación; no realiza una segunda conversión. Un error de red indica revisar la biblioteca antes de repetir, porque la carga podría haberse guardado.

En Eventos, crear o editar incluye el selector de la biblioteca. Se permiten cero a tres imágenes diferentes; la primera seleccionada es principal. Hacer principal cambia la portada y Quitar elimina una asociación del formulario, sin borrar el archivo. El selector no carga archivos: las fotos deben existir en la biblioteca. El evento y sus asociaciones se guardan en la misma transacción.

## Persistencia

La migración 0007_biblioteca_imagenes.sql crea biblioteca_imagenes con ID, clave R2, nombre, peso, ancho, alto, estado, creador y fecha. Agrega evento_media.imagen_id como referencia opcional. Las filas conservan url, orden y es_principal para reutilizar el catálogo y los carruseles.

Las imágenes anteriores con URL externa se conservan. Editar otros campos de un evento no las elimina: omitir imagenIds mantiene su galería. Si el administrador confirma una selección nueva, reemplaza explícitamente las imágenes anteriores por imágenes de la biblioteca. No se descargan automáticamente los archivos externos.

Las fotos se almacenan en R2 mediante la conexión R2_MEDIA. Los archivos se sirven con image/webp y nosniff desde /api/imagenes/:id, con cinco minutos de caché. Las imágenes activas de la biblioteca son públicas mediante esa URL, incluso antes de asociarlas a una actividad. La biblioteca es para material público; la gestión requiere sesión activa de administrador.

## Eliminación y fallos

No se puede eliminar una imagen asociada a una actividad, aunque esté en borrador o cerrada. La biblioteca muestra dónde se utiliza. Primero se debe quitar de todos los eventos y guardar.

La eliminación marca la fila como ELIMINANDO únicamente si no tiene asociaciones. Los triggers de evento_media impiden vincularla durante ese proceso y refuerzan el máximo de tres fotos diferentes por evento. Luego se elimina el objeto de R2 y su registro D1. Si falla R2, queda disponible Reintentar eliminación; esa imagen no puede volver a seleccionarse. Una copia previamente almacenada en caché puede seguir visible hasta que venza su caché.

Si falla guardar los metadatos tras cargar el archivo, se intenta retirar el objeto de R2. D1 y R2 no comparten una transacción: si también falla esa limpieza, podría quedar un objeto huérfano que requiera revisión del almacenamiento.

## Ambientes

- Local: cafecabra-imagenes-local, simulado por Wrangler, sin archivos remotos.
- Desarrollo: cafecabra-imagenes-dev.
- Producción: cafecabra-imagenes.

Los nombres y la conexión R2_MEDIA están preparados en backend/wrangler.jsonc. En esta implementación no se crearon buckets remotos, no se desplegó y no se modificó D1 remoto.

Antes de publicar en dev, crear o verificar el bucket cafecabra-imagenes-dev en la cuenta de Cloudflare que usa el despliegue. Si no existe, desde backend y con acceso a esa cuenta:

```powershell
npx wrangler r2 bucket create cafecabra-imagenes-dev
```

El push a dev aplica las migraciones mediante el workflow existente y despliega el Worker con R2_MEDIA. No se necesita hacer público el bucket ni configurar un dominio R2: el Worker entrega las imágenes mediante /api/imagenes/:id. No se requiere una clave adicional para R2 porque se usa una conexión del Worker.

Producción requiere crear o verificar cafecabra-imagenes por separado antes de su despliegue. Los archivos cargados en local no se copian automáticamente a Cloudflare.

## Validación local

```powershell
npm run db:migrate:local --workspace backend
npm run typecheck
node scripts/check-image-library.mjs
npm run build
npm run dev
```

La prueba automatizada usa D1 y R2 temporales. Comprueba sesión, origen, formatos, límites, escritura y lectura reales de R2, compensación si falla D1, selección de hasta tres imágenes, orden y principal, reutilización, catálogo, conservación de URLs anteriores y eliminación protegida con reintento.

También se probó el selector y la carga múltiple en el navegador local con los logotipos públicos existentes y el favicon. Se guardaron tres WebP en la biblioteca local; no se reemplazaron las fotografías de los cursos.
