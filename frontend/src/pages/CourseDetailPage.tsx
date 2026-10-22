import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { formatPrice, type CatalogItem } from '../features/catalog/catalog-data';

export function CourseDetailPage({ course }: { course: CatalogItem }) {
  return (
    <main id="contenido" className="container experience-page">
      <Breadcrumbs items={[{ label: 'Cursos', to: '/#cursos' }, { label: course.title }]} />
      <section className="detail-hero" aria-labelledby="detail-title">
        {course.image ? <img className="detail-photo" src={course.image} alt={course.imageAlt} /> : <div className="detail-photo course-placeholder">CAFÉ CABRA · ESCUELA</div>}
        <div className="detail-copy">
          <p className="eyebrow">CAFÉ CABRA · ESCUELA</p>
          <h1 id="detail-title">{course.title}</h1>
          <p>{course.description.split('\n')[0]}</p>
          <p>{course.type === 'Curso' ? 'Profesor' : 'Anfitrión'}: {course.instructors.join(', ') || 'Por confirmar'}</p>
          <p><strong>Valor: {course.requiresPayment ? formatPrice(course.price) : 'Entrada liberada'}</strong></p>
          <p className="location-line"><span aria-hidden="true">⌖</span>{course.location}</p>
          <span className="availability-badge">{course.status !== 'ABIERTO' ? 'Próximamente · Horario por confirmar' : course.remainingSeats === null ? 'Inscripciones abiertas' : `${course.remainingSeats} cupos disponibles`}</span>
        </div>
      </section>
      <section className="panel reserve-callout" aria-labelledby="reserve-title">
        <div><h2 id="reserve-title">Reserva tu experiencia</h2><p className="muted">{course.dateMode === 'CONJUNTAS' ? 'La inscripción incluye todas las jornadas del curso.' : 'Consulta las fechas disponibles y elige cuándo participar.'}</p></div>
        {course.status === 'ABIERTO' ? <Link className="button button-dark" to={`/cursos/${course.id}/agenda`}>Ver disponibilidad <span aria-hidden="true">→</span></Link> : <p>Pronto confirmaremos los horarios para inscribirte.</p>}
      </section>
      <section className="learning-section" aria-labelledby="learning-title">
        <h2 id="learning-title">¿Qué aprenderás?</h2>
        <div className="panel"><p className="eyebrow">CONTENIDOS DE LA EXPERIENCIA</p><ul className="topic-list">{course.topics.map(topic => <li key={topic}><span aria-hidden="true">✓</span>{topic}</li>)}</ul></div>
      </section>
      <section className="panel course-information"><h2>Sobre esta experiencia</h2><p className="course-description">{course.description}</p>
        <h2>Incluye</h2><p>{course.includes || 'Por confirmar'}</p>
        {course.certificate && <p>Incluye certificado de participación.</p>}
      </section>
    </main>
  );
}
