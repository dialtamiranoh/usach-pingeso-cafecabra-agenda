import type { CatalogItem } from './catalog-data';
export function CourseCard({item,onSelect}:{item:CatalogItem;onSelect:(item:CatalogItem)=>void}) {
  return <article className="course-card"><div className="course-image"><img src={item.image} alt={item.imageAlt} loading="lazy" /></div><div className="course-body"><h3>{item.title}</h3><p>{item.description}</p><button className="button button-dark" onClick={()=>onSelect(item)}>{item.action}<span aria-hidden="true">→</span></button></div></article>;
}
