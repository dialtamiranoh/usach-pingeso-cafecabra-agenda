import { useEffect, useRef, useState } from 'react';
import { heroImage } from '../features/catalog/catalog-data';
import { EstadoBadge } from '../components/EstadoBadge';
import { ActionButton } from '../components/ActionButton';

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (preference.matches || document.hidden) video.current?.pause();
      else video.current?.play().catch(() => {});
    };
    update();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <div className="hero-photo">
    <div className="hero-video-frame">
      {failed ? <img src={heroImage} alt="Preparación de café de especialidad" /> : <>
        <video ref={video} autoPlay muted loop playsInline preload="metadata" poster={heroImage}
          aria-label="Preparación de café filtrado" onError={() => setFailed(true)}>
          <source src="/videos/cafe-preparacion.mp4" type="video/mp4" onError={() => setFailed(true)} />
        </video>

      </>}
    </div>
  </div>;
}
