import { useEffect, useState } from 'react';
import type { CatalogResponse } from '@cafecabra/shared';
import { toCatalogItem, type CatalogItem } from './catalog-data';

export function useCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/catalogo', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('No pudimos cargar los cursos. Intenta nuevamente.');
        const body: CatalogResponse = await response.json();
        if (!Array.isArray(body.events)) throw new Error('La respuesta del catálogo no es válida.');
        if (!controller.signal.aborted) setItems(body.events.map(toCatalogItem));
      }).catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No pudimos cargar los cursos.');
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return { items, loading, error, retry: () => setAttempt(value => value + 1) };
}
