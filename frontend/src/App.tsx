import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { EnrollmentPage } from './pages/EnrollmentPage';
import { catalogItems } from './features/catalog/catalog-data';
import { demoSessions, emptyDraft, type EnrollmentDraft } from './features/booking/booking-data';

function RouteAccessibility() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    document.title = `${heading?.innerText.replace(/\s+/g, ' ').trim() ?? 'Página no encontrada'} | Café Cabra`;
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
  }, [pathname, hash]);
  return null;
}

function NotFoundPage() {
  return <main id="contenido" className="container experience-page">
    <p className="eyebrow">CAFÉ CABRA</p><h1>No encontramos esta página</h1>
    <p className="muted">Puedes volver al catálogo y elegir una de nuestras experiencias.</p>
    <Link to="/" className="button button-dark">Volver al catálogo →</Link>
  </main>;
}

function CourseRoute({ view, drafts, onChangeDraft }: {
  view: 'detail' | 'agenda' | 'enrollment';
  drafts: Record<string, EnrollmentDraft>;
  onChangeDraft: (key: string, draft: EnrollmentDraft) => void;
}) {
  const { courseId } = useParams();
  const [params] = useSearchParams();
  const course = catalogItems.find(item => item.id === courseId);
  if (!course) return <NotFoundPage />;
  if (view === 'detail') return <CourseDetailPage course={course} />;
  if (view === 'agenda') return <AvailabilityPage key={course.id} course={course} />;
  const session = demoSessions.find(item => item.courseId === course.id && item.id === params.get('sesion') && item.remainingSeats > 0);
  if (!session) return <Navigate to={`/cursos/${course.id}/agenda`} replace />;
  // Se conserva solo en memoria al navegar. Una recarga borra los datos personales.
  return <EnrollmentPage key={session.id} course={course} session={session} draft={drafts[session.id] ?? emptyDraft}
    onChange={draft => onChangeDraft(session.id, draft)} />;
}

export default function App() {
  const [drafts, setDrafts] = useState<Record<string, EnrollmentDraft>>({});
  const routeProps = { drafts, onChangeDraft: (key: string, draft: EnrollmentDraft) => setDrafts(previous => ({ ...previous, [key]: draft })) };
  return <SiteLayout>
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/cursos/:courseId" element={<CourseRoute view="detail" {...routeProps} />} />
      <Route path="/cursos/:courseId/agenda" element={<CourseRoute view="agenda" {...routeProps} />} />
      <Route path="/cursos/:courseId/inscripcion" element={<CourseRoute view="enrollment" {...routeProps} />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <RouteAccessibility />
  </SiteLayout>;
}
