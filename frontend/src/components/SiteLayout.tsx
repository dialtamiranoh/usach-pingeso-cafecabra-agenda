import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRightLong, FaInstagram, FaMugHot } from 'react-icons/fa6';
import { BrandLogo } from './BrandLogo';


export function SiteLayout({children}:{children:ReactNode}) {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand-link" to="/" aria-label="Café Cabra, inicio"><BrandLogo /></Link>
          <nav aria-label="Navegación principal"><Link to="/#cursos">Cursos y experiencias <FaArrowRightLong aria-hidden="true" /></Link></nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div><Link className="brand-link" to="/" aria-label="Café Cabra, inicio"><BrandLogo /></Link><p>Café de especialidad. Aprendizaje compartido.</p></div>
                    <div className="footer-links"><a href="https://cafecabra.cl" target="_blank" rel="noreferrer"><FaMugHot aria-hidden="true" style={{ verticalAlign: '-0.125em' }} /> Visita nuestra cafetería</a><a href="https://www.instagram.com/cafecabra/" target="_blank" rel="noreferrer"><FaInstagram aria-hidden="true" style={{ verticalAlign: '-0.125em' }} /> Instagram</a></div>
        </div>
      </footer>
    </>
  );
}
