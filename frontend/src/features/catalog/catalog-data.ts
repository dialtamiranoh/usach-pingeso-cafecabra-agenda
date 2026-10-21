// Datos de ejemplo, independientes del futuro modelo D1.
export interface CatalogItem { id: string; title: string; description: string; image: string; imageAlt: string; action: string; topics: string[] }
// Fotos provisionales: faltan los archivos originales del mockup.
export const heroImage = 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=85';
export const catalogItems: CatalogItem[] = [
  { id:'latte-art', title:'Curso de Latte Art', description:'Aprende técnicas de texturización, vertido y diseño para crear increíbles figuras en cada taza.', image:'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1000&q=85', imageAlt:'Taza de café con un diseño de latte art', action:'Ver curso', topics:['Texturización de la leche','Control del vertido','Diseños y composición'] },
  { id:'catas', title:'Catas y experiencias', description:'Descubre nuevas experiencias y actividades alrededor del café de especialidad.', image:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85', imageAlt:'Preparación de café de especialidad', action:'Ver actividades', topics:['Aromas y sabores del café','Orígenes y métodos de preparación','Degustación guiada'] },
];
