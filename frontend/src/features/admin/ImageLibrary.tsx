import { useEffect, useRef, useState } from 'react';
import { FaCloudArrowUp, FaTrashCan, FaCheck } from 'react-icons/fa6';
import { deleteImage, listImages, optimizeImage, uploadImage, type ImageList, type LibraryImage } from './image-library';

const button = 'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md border border-[#d4d4d4] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';
export function ImageLibrary({ selection, onToggle }: { selection?: string[]; onToggle?: (image: LibraryImage) => void }) {
  const choosing = selection !== undefined;
  const [data, setData] = useState<ImageList>({ items: [], total: 0, page: 1, pageSize: 24 });
  const [page, setPage] = useState(1), [query, setQuery] = useState(''), [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false), [progress, setProgress] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null), [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null), uploading = useRef(false), dragDepth = useRef(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      listImages(page, query, abort.signal).then(setData).catch(e => { if (!abort.signal.aborted) setError(e.message); })
        .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }, 200);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [page, query, version]);
  async function upload(files: File[]) {
    if (uploading.current || choosing || !files.length) return;
    if (files.length > 10) { setError('Sube hasta 10 imágenes a la vez.'); return; }
    uploading.current = true; setBusy(true); setError(''); setNotice(''); setFailures([]);
    const problems: string[] = []; let saved = 0;
    try {
      for (const [index, file] of files.entries()) {
        try {
          setProgress('Preparando ' + file.name + ' (' + (index + 1) + '/' + files.length + ')');
          const optimized = await optimizeImage(file);
          await uploadImage(optimized, value => setProgress('Subiendo ' + file.name + ': ' + value + '%'));
          saved++;
        } catch (e) { problems.push(file.name + ': ' + (e instanceof Error ? e.message : 'No se pudo subir.')); }
      }
      setFailures(problems); if (saved) setNotice(saved + (saved === 1 ? ' imagen guardada.' : ' imágenes guardadas.'));
      setPage(1); setVersion(v => v + 1);
    } finally { setBusy(false); uploading.current = false; setProgress(''); if (input.current) input.current.value = ''; }
  }
  async function remove(image: LibraryImage) {
    setDeleting(image.id); setError(''); setNotice('');
    try { await deleteImage(image.id); setConfirmDelete(null); setNotice('Imagen eliminada.'); setPage(1); setVersion(v => v + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar.'); setVersion(v => v + 1); }
    finally { setDeleting(null); }
  }
  return <section className="space-y-4" aria-label="Biblioteca de imágenes">
    {!choosing && <>
      <div><h2 className="text-base font-semibold">Biblioteca de imágenes</h2><p className="mt-1 text-sm text-[#6b6b6b]">Sube JPG, PNG o WebP de hasta 5 MB. Las imágenes se convierten a WebP, con un máximo de 1600 píxeles y 500 KB. Puedes cargar hasta 10 a la vez.</p></div>
      <div onDragEnter={e => { e.preventDefault(); dragDepth.current++; setDragging(true); }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = busy ? 'none' : 'copy'; }}
        onDragLeave={e => { e.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
        onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); void upload(Array.from(e.dataTransfer.files)); }}
        className={'rounded-lg border-2 border-dashed p-8 text-center ' + (dragging ? 'border-[#e6bb08] bg-[#fffbea]' : 'border-[#d4d4d4] bg-[#fafafa]')}>
        <FaCloudArrowUp className="mx-auto mb-3 text-3xl" aria-hidden="true" />
        <p className="mb-3 text-sm">Arrastra tus imágenes aquí o selecciónalas desde tu equipo.</p>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
          onChange={e => void upload(Array.from(e.target.files ?? []))} disabled={busy} aria-label="Archivos de imagen" />
        <button type="button" className={button + ' bg-black text-white'} disabled={busy} onClick={() => input.current?.click()}>Subir imágenes</button>
        {busy && <p role="status" className="mt-3 text-sm" aria-live="polite">{progress}</p>}
      </div>
    </>}
    <label className="block text-sm">Buscar por nombre
      <input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="mt-1 block w-full rounded-md border border-[#d4d4d4] px-3 py-2" />
    </label>
    {notice && <p role="status" className="text-sm text-[#1a7f37]">{notice}</p>}
    {error && <div role="alert" className="text-sm text-[#b3261e]">{error} <button type="button" className="underline" onClick={() => setVersion(v => v + 1)}>Actualizar biblioteca</button></div>}
    {!!failures.length && <ul role="alert" className="space-y-1 text-sm text-[#b3261e]">{failures.map((message, i) => <li key={i}>{message}</li>)}</ul>}
    {loading ? <p role="status" className="text-sm text-[#6b6b6b]">Cargando imágenes...</p> : <>
      {!data.items.length && <p className="rounded-md bg-[#f5f5f5] p-5 text-sm">No hay imágenes{query ? ' con ese nombre.' : '. Súbelas desde Mantenedores → Biblioteca de imágenes.'}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map(image => {
          const selected = selection?.includes(image.id), unavailable = image.estado !== 'ACTIVA';
          return <article key={image.id} className={'overflow-hidden rounded-lg border bg-white ' + (selected ? 'border-[#e6bb08] ring-2 ring-[#e6bb08]' : 'border-[#e5e5e5]')}>
            {choosing ? <button type="button" aria-pressed={Boolean(selected)} aria-label={(selected ? 'Quitar ' : 'Seleccionar ') + image.nombre}
              className="block w-full" disabled={unavailable || (!selected && selection.length >= 3)} onClick={() => onToggle?.(image)}>
              <img src={image.url} alt={image.nombre} loading="lazy" className="h-36 w-full object-cover" />
            </button> : !unavailable ? <img src={image.url} alt={image.nombre} loading="lazy" className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-[#f5f5f5] text-sm">Eliminación pendiente</div>}
            <div className="space-y-2 p-3">
              <p className="break-all text-sm font-medium">{image.nombre}</p>
              <p className="text-xs text-[#6b6b6b]">{Math.ceil(image.peso / 1024)} KB · {image.ancho} × {image.alto} px</p>
              {choosing ? <button type="button" className={button + ' w-full'} disabled={unavailable || (!selected && selection.length >= 3)} onClick={() => onToggle?.(image)}>
                {selected && <FaCheck aria-hidden="true" />}{selected ? 'Seleccionada ' + (selection.indexOf(image.id) + 1) : 'Seleccionar'}
              </button> : <>
                <p className="text-xs text-[#6b6b6b]">{image.usos.length ? `En uso en ${image.usos.length} ${image.usos.length === 1 ? 'actividad' : 'actividades'}` : 'Sin uso'}</p>
                {confirmDelete === image.id ? <div className="space-y-2"><p className="text-sm">¿Eliminar esta imagen definitivamente?</p><div className="flex flex-wrap gap-2">
                  <button type="button" className={button} disabled={deleting !== null} onClick={() => void remove(image)}>{deleting === image.id ? 'Eliminando...' : 'Sí, eliminar'}</button>
                  <button type="button" className={button} disabled={deleting !== null} onClick={() => setConfirmDelete(null)}>Cancelar</button>
                </div></div> : <button type="button" className={button} disabled={!!image.usos.length || deleting !== null || busy}
                  title={image.usos.length ? 'Quita la imagen de sus eventos antes de eliminarla.' : undefined} onClick={() => setConfirmDelete(image.id)}>
                  <FaTrashCan aria-hidden="true" />{unavailable ? 'Reintentar eliminación' : 'Eliminar'}
                </button>}
              </>}
            </div>
          </article>;
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className={button} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <span className="order-first w-full text-center sm:order-none sm:w-auto">Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))} · {data.total} imágenes</span>
        <button type="button" className={button} disabled={page * data.pageSize >= data.total} onClick={() => setPage(p => p + 1)}>Siguiente</button>
      </div>
    </>}
  </section>;
}
