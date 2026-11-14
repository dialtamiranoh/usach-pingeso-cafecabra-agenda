import { useId, useState } from 'react';

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const photoId = useId();
  const active = images.length ? selected % images.length : 0;

  return <div className="image-gallery" role="group" aria-label={`Galería de ${title}`}>
    <div className="gallery-main detail-photo" id={photoId}>
      {images.length ? <img key={images[active]} src={images[active]} alt={`${title}, fotografía ${active + 1}`} />
        : <div className="course-placeholder">CAFÉ CABRA • ESCUELA</div>}
    </div>
    {images.length > 1 && <div className="gallery-thumbnails" role="group" aria-label="Elegir fotografía">
      {images.map((url, index) => <button key={`${index}-${url}`} type="button" className="gallery-thumbnail"
        aria-label={`Ver fotografía ${index + 1} de ${title}`} aria-pressed={index === active} aria-controls={photoId}
        onClick={() => setSelected(index)}>
        <img src={url} alt="" loading="lazy" draggable={false} />
      </button>)}
    </div>}
  </div>;
}
