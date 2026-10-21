import { useNavigate } from 'react-router-dom';
import { catalogItems, heroImage } from '../features/catalog/catalog-data';
import { CourseCard } from '../features/catalog/CourseCard';
export function CatalogPage() {
  const navigate = useNavigate();
  return (
    <main id="contenido">
      <section className="hero" id="inicio" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <div><p className="eyebrow">CAFÉ CABRA · ESCUELA</p><h1 id="hero-title">Aprende el arte<br />del café.</h1><p className="hero-description">Descubre nuestros cursos y experiencias de café de especialidad. Aprende, practica y comparte tu pasión por el café.</p><a className="button button-dark" href="#cursos">Explorar cursos <span aria-hidden="true">→</span></a></div>
          <div className="hero-photo"><img src={heroImage} alt="Café de especialidad recién preparado" fetchPriority="high" /><span>Una taza. Muchas formas de aprender.</span></div>
        </div>
      </section>
      <section className="catalog container" id="cursos" aria-labelledby="catalog-title">
        <div className="section-heading"><h2 id="catalog-title">Nuestros cursos</h2><span aria-hidden="true">01 /</span></div>
        <p className="section-description">Descubre nuestras experiencias y aprende nuevas técnicas junto a expertos del café.</p>
        <div className="course-grid">{catalogItems.map(item => <CourseCard key={item.id} item={item} onSelect={course => navigate(`/cursos/${course.id}`)} />)}</div>
        <p className="demo-note">Vista de demostración · Actividades de ejemplo</p>
      </section>
    </main>
  );
}
