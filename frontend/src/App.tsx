import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { EnrollmentPage } from './pages/EnrollmentPage';
import type { CatalogItem } from './features/catalog/catalog-data';
import { useCatalog } from './features/catalog/useCatalog';
import { emptyDraft, validatePersonalDetails, type EnrollmentDraft } from './features/booking/booking-data';

function RouteAccessibility({ contentKey }: { contentKey: string }) {
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
  }, [pathname, hash, contentKey]);
  return null;
}

function NotFoundPage() {
  return <main id="contenido" className="container experience-page">
    <p className="eyebrow">CAFÉ CABRA</p><h1>No encontramos esta página</h1>
    <p className="muted">Puedes volver al catálogo y elegir una de nuestras experiencias.</p>
    <Link to="/" className="button button-dark">Volver al catálogo →</Link>
  </main>;
}

function CourseRoute({ view, drafts, onChangeDraft, catalogItems, loading, error, retry }: {
  catalogItems: CatalogItem[];
  loading: boolean;
  error: string;
  retry: () => void;
  view: 'detail' | 'agenda' | 'enrollment' | 'transfer';
  drafts: Record<string, EnrollmentDraft>;
  onChangeDraft: (key: string, draft: EnrollmentDraft) => void;
}) {
  const { courseId } = useParams();
  const [params] = useSearchParams();
  if (loading) return <main id="contenido" className="container experience-page"><h1>Cargando curso…</h1></main>;
  if (error) return <main id="contenido" className="container experience-page"><h1>No pudimos cargar el curso</h1><p role="alert">{error}</p><button className="button button-dark" onClick={retry}>Reintentar</button></main>;
  const course = catalogItems.find(item => item.id === courseId);
  if (!course) return <NotFoundPage />;
  if (view === 'detail') return <CourseDetailPage course={course} />;
  if (view === 'agenda') return <AvailabilityPage key={course.id} course={course} />;
  const session = course.sessions.find(item => item.courseId === course.id && item.id === params.get('sesion') && item.remainingSeats > 0);
  if (!session) return <Navigate to={`/cursos/${course.id}/agenda`} replace />;
  // Se conserva solo en memoria al navegar. Una recarga borra los datos personales.
  const draft = { ...emptyDraft, ...drafts[session.id] };
  if (view === 'transfer' && (!course.requiresPayment || Object.keys(validatePersonalDetails(draft)).length)) {
    return <Navigate to={`/cursos/${course.id}/inscripcion?sesion=${session.id}`} replace />;
  }
  return <EnrollmentPage key={`${session.id}-${view}`} course={course} session={session} draft={draft} step={view === 'transfer' ? 'transfer' : 'personal'}
    onChange={draft => onChangeDraft(session.id, draft)} />;
}

export default function App() {
  const { items: catalogItems, loading, error, retry } = useCatalog();
  const [drafts, setDrafts] = useState<Record<string, EnrollmentDraft>>({});
  const routeProps = { catalogItems, loading, error, retry, drafts, onChangeDraft: (key: string, draft: EnrollmentDraft) => setDrafts(previous => ({ ...previous, [key]: draft })) };
  return <SiteLayout>
    <Routes>
      <Route path="/gestion/cursos" element={<Navigate to="/#cursos" replace />} />
      <Route path="/" element={<CatalogPage items={catalogItems} loading={loading} error={error} retry={retry} />} />
      <Route path="/cursos/:courseId" element={<CourseRoute view="detail" {...routeProps} />} />
      <Route path="/cursos/:courseId/agenda" element={<CourseRoute view="agenda" {...routeProps} />} />
      <Route path="/cursos/:courseId/inscripcion" element={<CourseRoute view="enrollment" {...routeProps} />} />
      <Route path="/cursos/:courseId/transferencia" element={<CourseRoute view="transfer" {...routeProps} />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <RouteAccessibility contentKey={`${loading}-${error}-${catalogItems.length}`} />
  </SiteLayout>;
}
