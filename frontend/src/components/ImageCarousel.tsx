import { useEffect, useState } from 'react';

export function ImageCarousel({ images, title, className = '', eager = false }: {
  images: string[]; title: string; className?: string; eager?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const multiple = images.length > 1;
  const active = images.length ? index % images.length : 0;
  const slides = multiple ? [...images, images[0]] : images;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!multiple || hovered || focused || reducedMotion || !visible) return;
    const timer = window.setInterval(() => setIndex(previous => (previous % images.length) + 1), 4500);
    return () => window.clearInterval(timer);
  }, [multiple, images.length, hovered, focused, reducedMotion, visible]);

  return <div className={`image-carousel ${className}`} role="group" aria-roledescription="carrusel" aria-label={`Imágenes de ${title}`}
    tabIndex={multiple ? 0 : undefined}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
    <div className="carousel-viewport">
      {images.length ? <div className={`carousel-track ${index === 0 ? 'carousel-reset' : ''}`}
        style={{ transform: `translateX(-${index <= images.length ? index * 100 : active * 100}%)` }}
        onTransitionEnd={event => {
          if (event.target === event.currentTarget && event.propertyName === 'transform' && index === images.length) setIndex(0);
        }}>
        {slides.map((url, position) => <img key={`${position}-${url}`} className="carousel-slide" src={url}
          alt={position === images.length ? '' : `${title} · fotografía ${position + 1}`}
          aria-hidden={position !== active || position === images.length}
          loading={eager && position === 0 ? 'eager' : 'lazy'} draggable={false} />)}
      </div> : <div className="course-placeholder">CAFÉ CABRA · ESCUELA</div>}
    </div>
  </div>;
}
