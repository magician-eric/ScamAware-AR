import { Link } from 'react-router-dom';

// Thin wrapper around the existing .btn(+.secondary/.danger) classes — no new
// visual system, just gives the existing design language a component API.
export function Button({ variant, to, href, onClick, children, className = '', ...rest }) {
  const classes = ['btn', variant, className].filter(Boolean).join(' ');
  if (to) {
    return (
      <Link className={classes} to={to} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a className={classes} href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
