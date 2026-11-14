import type { ButtonHTMLAttributes } from 'react';
import type { IconType } from 'react-icons';
import {
  FaPlus, FaPen, FaFloppyDisk, FaTrashCan, FaCircleCheck, FaBan, FaXmark,
  FaEye, FaEyeSlash, FaMoneyBillWave, FaFileCsv, FaGlobe, FaPaperPlane, FaCopy,
} from 'react-icons/fa6';

// Botón de acción reutilizable para el panel. Cada variante trae su ícono (Font Awesome)
// y su color. Estética tipo HyperUI, con la paleta del panel (negro / blanco / acento) y
// rojo/verde solo para acciones destructivas o de confirmación.
//
// Uso:  <ActionButton variant="editar" onClick={...} />
//       <ActionButton variant="eliminar" label="Borrar" onClick={...} />
//       <ActionButton variant="guardar" type="submit" loading={guardando} />
//       <ActionButton variant="desactivar" iconOnly title="Desactivar" onClick={...} />

export type ActionVariant =
  | 'crear' | 'editar' | 'guardar' | 'eliminar' | 'activar' | 'desactivar'
  | 'cancelar' | 'ver' | 'confirmarPago' | 'exportar' | 'publicar'
  | 'despublicar' | 'comunicar' | 'duplicar';

const TONO = {
  primario: 'bg-[#111111] text-white hover:bg-black',
  contorno: 'border border-[#d4d4d4] text-[#111111] hover:bg-[#f5f5f4]',
  tenue: 'border border-[#d4d4d4] text-[#6b6b6b] hover:bg-[#f5f5f4]',
  peligro: 'bg-[#b3261e] text-white hover:bg-[#8f1e18]',
  exito: 'bg-[#1a7f37] text-white hover:bg-[#156a2d]',
} as const;

const VARIANTES: Record<ActionVariant, { label: string; Icon: IconType; tono: keyof typeof TONO }> = {
  crear:         { label: 'Nuevo',          Icon: FaPlus,          tono: 'primario' },
  editar:        { label: 'Editar',         Icon: FaPen,           tono: 'contorno' },
  guardar:       { label: 'Guardar',        Icon: FaFloppyDisk,    tono: 'primario' },
  eliminar:      { label: 'Eliminar',       Icon: FaTrashCan,      tono: 'peligro'  },
  activar:       { label: 'Activar',        Icon: FaCircleCheck,   tono: 'exito'    },
  desactivar:    { label: 'Desactivar',     Icon: FaBan,           tono: 'tenue'    },
  cancelar:      { label: 'Cancelar',       Icon: FaXmark,         tono: 'contorno' },
  ver:           { label: 'Ver',            Icon: FaEye,           tono: 'contorno' },
  confirmarPago: { label: 'Confirmar pago', Icon: FaMoneyBillWave, tono: 'exito'    },
  exportar:      { label: 'Exportar CSV',   Icon: FaFileCsv,       tono: 'contorno' },
  publicar:      { label: 'Publicar',       Icon: FaGlobe,         tono: 'primario' },
  despublicar:   { label: 'Despublicar',    Icon: FaEyeSlash,      tono: 'tenue'    },
  comunicar:     { label: 'Comunicar',      Icon: FaPaperPlane,    tono: 'primario' },
  duplicar:      { label: 'Duplicar',       Icon: FaCopy,          tono: 'contorno' },
};

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant: ActionVariant;
  label?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function ActionButton({ variant, label, iconOnly, size = 'md', loading, disabled, className = '', ...rest }: ActionButtonProps) {
  const def = VARIANTES[variant];
  const texto = label ?? def.label;
  const dims = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      title={rest.title ?? (iconOnly ? texto : undefined)}
      aria-label={iconOnly ? texto : undefined}
      className={`${base} ${dims} ${iconOnly ? '!px-2' : ''} ${TONO[def.tono]} ${className}`}
    >
      <def.Icon aria-hidden="true" className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      {!iconOnly && (loading ? 'Guardando...' : texto)}
    </button>
  );
}