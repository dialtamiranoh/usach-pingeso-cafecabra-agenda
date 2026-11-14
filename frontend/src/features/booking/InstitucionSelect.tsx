import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { INSTITUCIONES_FINANCIERAS, type TipoInstitucionFinanciera } from '@cafecabra/shared';
import { FaArrowRightLong } from 'react-icons/fa6';
import { EstadoBadge } from '../../components/EstadoBadge';
import { ActionButton } from '../../components/ActionButton';

// SCRUM-91: lista desplegable propia para el campo "Banco de origen".
//
// Se reemplaza el <select> nativo debido a que el navegador es el encargado de dibujar su
// lista, por lo que con las 27 instituciones del catálogo esta se abre con una altura
// excesiva y en una posición que no se puede controlar mediante CSS. Esta versión se abre
// justo debajo del campo, con una altura máxima y desplazamiento interno, y sigue el patrón
// de accesibilidad de un combobox de solo selección (botón + listbox), es decir, se puede
// operar con mouse y con teclado:
//   - Enter, espacio o flecha abajo abren la lista.
//   - Flechas arriba y abajo recorren las opciones, Inicio y Fin van al extremo.
//   - Enter selecciona la opción activa y Escape cierra la lista sin cambios.
//   - Al presionar una letra se salta a la primera institución que comienza con ella.

const gruposDeInstituciones: { tipo: TipoInstitucionFinanciera; etiqueta: string }[] = [
  { tipo: 'BANCO', etiqueta: 'Bancos' },
  { tipo: 'EMISOR_PREPAGO', etiqueta: 'Billeteras y prepago' },
  { tipo: 'COOPERATIVA', etiqueta: 'Cooperativas' },
];

// Orden plano de las opciones, el cual coincide con el orden en que se dibujan los grupos y
// se utiliza para la navegación con teclado.
const opcionesEnOrden = gruposDeInstituciones.flatMap(grupo =>
  INSTITUCIONES_FINANCIERAS.filter(institucion => institucion.tipo === grupo.tipo).map(institucion => institucion.nombre),
);

interface InstitucionSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  error?: string;
}

export function InstitucionSelect({ id, label, value, onChange, error }: InstitucionSelectProps) {
  const [abierta, setAbierta] = useState(false);
  // Índice de la opción resaltada mientras la lista está abierta, -1 cuando no hay ninguna.
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const prefijo = useId();
  const idLista = `${id}-lista`;
  const idOpcion = (indice: number) => `${prefijo}-opcion-${indice}`;

  // Se cierra la lista cuando el usuario hace clic fuera del componente.
  useEffect(() => {
    if (!abierta) return;
    function alPresionarFuera(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierta(false);
    }
    document.addEventListener('mousedown', alPresionarFuera);
    return () => document.removeEventListener('mousedown', alPresionarFuera);
  }, [abierta]);

  // Se mantiene visible la opción activa dentro del área con desplazamiento.
  useEffect(() => {
    if (!abierta || indiceActivo < 0) return;
    document.getElementById(idOpcion(indiceActivo))?.scrollIntoView({ block: 'nearest' });
  }, [abierta, indiceActivo]);

  function abrirLista() {
    const indiceSeleccionado = opcionesEnOrden.indexOf(value);
    setIndiceActivo(indiceSeleccionado >= 0 ? indiceSeleccionado : 0);
    setAbierta(true);
  }

  function seleccionar(indice: number) {
    onChange(opcionesEnOrden[indice]);
    setAbierta(false);
    botonRef.current?.focus();
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLButtonElement>) {
    const ultimo = opcionesEnOrden.length - 1;

    if (!abierta) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(evento.key)) {
        evento.preventDefault();
        abrirLista();
      }
      return;
    }

    switch (evento.key) {
      case 'ArrowDown': evento.preventDefault(); setIndiceActivo(indice => Math.min(indice + 1, ultimo)); break;
      case 'ArrowUp': evento.preventDefault(); setIndiceActivo(indice => Math.max(indice - 1, 0)); break;
      case 'Home': evento.preventDefault(); setIndiceActivo(0); break;
      case 'End': evento.preventDefault(); setIndiceActivo(ultimo); break;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        if (indiceActivo >= 0) seleccionar(indiceActivo);
        break;
      case 'Escape': evento.preventDefault(); setAbierta(false); break;
      case 'Tab': setAbierta(false); break;
      default:
        // Búsqueda por primera letra, sin considerar mayúsculas ni tildes.
        if (evento.key.length === 1) {
          const letra = evento.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
          const encontrado = opcionesEnOrden.findIndex(nombre =>
            nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().startsWith(letra));
          if (encontrado >= 0) setIndiceActivo(encontrado);
        }
    }
  }

  const describedBy = error ? `${id}-error` : undefined;

  return <div className="field institucion-select" ref={contenedorRef}>
    <label id={`${id}-label`} htmlFor={id}>{label} *</label>
    {/* Contenedor de referencia para posicionar la lista justo debajo del botón. */}
    <div className="institucion-select-control">
    <button
      ref={botonRef}
      id={id}
      type="button"
      className="institucion-select-boton"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={abierta}
      aria-controls={idLista}
      aria-labelledby={`${id}-label ${id}`}
      aria-activedescendant={abierta && indiceActivo >= 0 ? idOpcion(indiceActivo) : undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      onClick={() => (abierta ? setAbierta(false) : abrirLista())}
      onKeyDown={alPresionarTecla}
    >
      <span className={value ? undefined : 'institucion-select-placeholder'}>{value || 'Selecciona una opción'}</span>
      <span className="institucion-select-flecha" aria-hidden="true">▾</span>
    </button>

    {abierta && <ul id={idLista} role="listbox" aria-labelledby={`${id}-label`} className="institucion-select-lista">
      {gruposDeInstituciones.map(grupo => <li key={grupo.tipo} role="presentation">
        <div className="institucion-select-grupo" aria-hidden="true">{grupo.etiqueta}</div>
        <ul role="group" aria-label={grupo.etiqueta}>
          {INSTITUCIONES_FINANCIERAS.filter(institucion => institucion.tipo === grupo.tipo).map(institucion => {
            const indice = opcionesEnOrden.indexOf(institucion.nombre);
            return <li
              key={institucion.nombre}
              id={idOpcion(indice)}
              role="option"
              aria-selected={institucion.nombre === value}
              className={`institucion-select-opcion${indice === indiceActivo ? ' activa' : ''}`}
              // Se usa mousedown para que la selección ocurra antes de que el botón pierda el foco.
              onMouseDown={evento => { evento.preventDefault(); seleccionar(indice); }}
              onMouseEnter={() => setIndiceActivo(indice)}
            >
              {institucion.nombre}
            </li>;
          })}
        </ul>
      </li>)}
    </ul>}
    </div>

    {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}
