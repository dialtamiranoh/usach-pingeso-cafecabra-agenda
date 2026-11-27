import { useRef, useState } from 'react';
import { ImageLibrary } from './ImageLibrary';
import type { LibraryImage } from './image-library';

export interface SelectedImage { id: string | null; url: string }
export function EventImages({ images, onChange, disabled }: { images: SelectedImage[]; onChange: (images: SelectedImage[]) => void; disabled?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<SelectedImage[]>([]);
  const button = 'min-h-11 max-w-full rounded-md border border-[#d4d4d4] px-3 py-2 text-sm disabled:opacity-50';
  const legacy = images.some(image => !image.id);
  function open() { setDraft(images.filter(image => image.id)); dialog.current?.showModal(); }
  function toggle(image: LibraryImage) {
    setDraft(prev => prev.some(row => row.id === image.id) ? prev.filter(row => row.id !== image.id) : prev.length < 3 ? [...prev, image] : prev);
  }
  return <section className="space-y-3 border-t border-[#e5e5e5] pt-4">
    <div><h4 className="text-sm font-semibold">Imágenes del evento</h4><p className="mt-1 text-sm text-[#6b6b6b]">Puedes seleccionar hasta 3 imágenes de la biblioteca. La primera seleccionada será la principal.</p></div>
    <div className="flex flex-wrap gap-3">
      {images.map((image, index) => <article key={image.id ?? image.url} className="w-40 overflow-hidden rounded-md border border-[#e5e5e5]">
        <img src={image.url} alt={'Imagen ' + (index + 1) + ' del evento'} className="h-28 w-full object-cover" />
        <div className="space-y-2 p-2"><p className="text-xs font-medium">{index === 0 ? 'Principal' : 'Secundaria ' + index}</p>
          {!legacy && <div className="flex flex-wrap gap-1">
            {index > 0 && <button type="button" className="text-xs underline" disabled={disabled} onClick={() => onChange([image, ...images.filter((_, i) => i !== index)])}>Hacer principal</button>}
            <button type="button" className="text-xs underline" disabled={disabled} onClick={() => onChange(images.filter((_, i) => i !== index))}>Quitar</button>
          </div>}
        </div>
      </article>)}
    </div>
    {legacy && <p className="text-xs text-[#6b6b6b]">Estas fotos son anteriores a la biblioteca y se conservarán al guardar. Si eliges imágenes de la biblioteca, reemplazarán las fotos actuales.</p>}
    <button type="button" className={button} disabled={disabled} onClick={open}>Seleccionar desde la biblioteca</button>
    <dialog ref={dialog} aria-labelledby="image-selector-title" className="m-auto max-h-[85dvh] w-[min(960px,94vw)] overflow-y-auto rounded-lg p-4 backdrop:bg-black/50 sm:p-5">
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 id="image-selector-title" className="text-lg font-semibold">Seleccionar imágenes</h3><p className="text-sm text-[#6b6b6b]">{draft.length} de 3 seleccionadas. Sube nuevas fotos desde Mantenedores → Biblioteca de imágenes.</p></div>
        <button type="button" className={button} onClick={() => dialog.current?.close()}>Cancelar</button></div>
      <ImageLibrary selection={draft.map(image => image.id!)} onToggle={toggle} />
      <div className="sticky bottom-0 mt-4 flex justify-end border-t border-[#e5e5e5] bg-white pt-3">
        <button type="button" className={button + ' bg-black text-white'} onClick={() => { onChange(draft); dialog.current?.close(); }}>Usar selección ({draft.length})</button>
      </div>
    </dialog>
  </section>;
}
