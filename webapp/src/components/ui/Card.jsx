// .hero and .card share identical CSS (both just the glass panel look) — the
// distinction in the old markup was purely semantic (intro/title section vs.
// a content section), so this is one component with a variant prop.
export function Card({ variant = 'card', className = '', children }) {
  return <section className={`${variant}${className ? ' ' + className : ''}`}>{children}</section>;
}
