import { useNavigate } from 'react-router-dom';
import type { CatalogItem } from '../features/catalog/catalog-data';
import { HeroVideo } from '../components/HeroVideo';
import { CourseCard } from '../features/catalog/CourseCard';
import { FaArrowRightLong } from 'react-icons/fa6';

export function CatalogPage({ items: catalogItems, loading, error, retry }: { items: CatalogItem[]; loading: boolean; error: string; retry: () => void }) {
  const navigate = useNavigate();
  return (
    <main id="contenido">
      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <div><p className="eyebrow">CAFÉ CABRA • ESCUELA</p><h1 id="hero-title">Aprende el arte<br />del café.</h1><p className="hero-description">Descubre nuestros cursos y experiencias de café de especialidad. Aprende, practica y comparte tu pasión por el café.</p><a className="button button-dark" href="#cursos">Explorar cursos <FaArrowRightLong aria-hidden="true" /></a></div>
          <HeroVideo />
        </div>
      </section>
      <section className="catalog container" id="cursos" aria-labelledby="catalog-title">
        <div className="section-heading"><h2 id="catalog-title">Cursos y eventos</h2><span aria-hidden="true">01 /</span></div>
        <p className="section-description">Descubre nuestras experiencias y aprende nuevas técnicas junto a expertos del café.</p>
        {loading && <p role="status">Cargando cursos…</p>}
        {error && <div role="alert"><p>{error}</p><button className="button button-dark" onClick={retry}>Reintentar</button></div>}
        {!loading && !error && !catalogItems.length && <p>No hay cursos ni catas disponibles por el momento.</p>}
        <div className="course-grid">{catalogItems.map(item => <CourseCard key={item.id} item={item} onSelect={course => navigate(`/cursos/${course.id}`)} />)}</div>
        <p className="demo-note">Cursos y eventos • Café Cabra</p>
      </section>
    </main>
  );
}
