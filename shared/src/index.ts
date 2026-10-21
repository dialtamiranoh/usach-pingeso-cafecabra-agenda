// Contratos públicos, sin secretos ni acceso a datos.
export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  time: string;
  environment: string;
  database?: 'ok' | 'error';
  tables?: string[];
  tableCount?: number;
  entorno?: string | null;
  error?: string;
}
