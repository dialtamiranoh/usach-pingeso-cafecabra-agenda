import { useEffect, useRef } from 'react';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import { FaArrowRightLong } from 'react-icons/fa6';
//import { EstadoBadge } from '../src/components/EstadoBadge';
//import { ActionButton } from '../src/components/ActionButton';

// Envoltorio mínimo de Chart.js: crea el gráfico al montar y lo destruye al desmontar.
// El template de HyperUI usa Chart.js para sparkline, línea y dona.
export function ChartCanvas({ config, ariaLabel, className }: {
  config: ChartConfiguration;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = new Chart(ref.current, config);
    return () => chart.destroy();
  }, [config]);

  return <canvas ref={ref} role="img" aria-label={ariaLabel} className={className} />;
}