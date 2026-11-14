import { ImageCarousel } from '../../components/ImageCarousel';
import { formatPrice, type CatalogItem } from './catalog-data';
import { FaArrowRightLong } from 'react-icons/fa6';

export function CourseCard({item,onSelect}:{item:CatalogItem;onSelect:(item:CatalogItem)=>void}) {
  return <article className="course-card"><ImageCarousel images={item.images} title={item.title} className="course-image" /><div className="course-body"><p className="eyebrow">{item.type}</p><h3>{item.title}</h3>{item.status !== 'ABIERTO' && <p className="availability-badge">Próximamente · Horario por confirmar</p>}<p>{item.description.split('\n')[0]}</p><p><strong>{item.requiresPayment ? formatPrice(item.price) : 'Entrada liberada'}</strong></p><button className="button button-dark" onClick={()=>onSelect(item)}>{item.action} <FaArrowRightLong aria-hidden="true" /></button></div></article>;
}
