import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import type { CatalogItem } from '../features/catalog/catalog-data';
import { demoLocation } from '../features/booking/booking-data';

export function CourseDetailPage({ course }: { course: CatalogItem }) {
  return (
    <main id="contenido" className="container experience-page">
      <Breadcrumbs items={[{ label: 'Cursos', to: '/#cursos' }, { label: course.title }]} />
      <section className="detail-hero" aria-labelledby="detail-title">
        <img className="detail-photo" src={course.image} alt={course.imageAlt} />
        <div className="detail-copy">
          <p className="eyebrow">CAFÉ CABRA · ESCUELA</p>
          <h1 id="detail-title">{course.title}</h1>
          <p>{course.description}</p>
          <p>Una experiencia cercana que combina teoría y práctica para descubrir el café de especialidad.</p>
          <p className="location-line"><span aria-hidden="true">⌖</span>{demoLocation}</p>
          <span className="availability-badge">Sesiones de ejemplo disponibles</span>
        </div>
      </section>
      <section className="panel reserve-callout" aria-labelledby="reserve-title">
        <div><h2 id="reserve-title">Reserva tu experiencia</h2><p className="muted">Explora las fechas y elige el horario que prefieras.</p></div>
        <Link className="button button-dark" to={`/cursos/${course.id}/agenda`}>Ver disponibilidad <span aria-hidden="true">→</span></Link>
      </section>
      <section className="learning-section" aria-labelledby="learning-title">
        <h2 id="learning-title">¿Qué aprenderás?</h2>
        <div className="panel"><p className="eyebrow">CONTENIDOS DE LA EXPERIENCIA</p><ul className="topic-list">{course.topics.map(topic => <li key={topic}><span aria-hidden="true">✓</span>{topic}</li>)}</ul></div>
      </section>
      <p className="demo-note">Contenido y fotografías de ejemplo. Fechas, cupos y contenidos por confirmar con Café Cabra.</p>
    </main>
  );
}
