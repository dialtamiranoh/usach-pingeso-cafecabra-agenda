import { Link } from 'react-router-dom';

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Ruta de navegación">
      <ol>
        <li><Link to="/">Inicio</Link></li>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <span aria-hidden="true">/</span>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
