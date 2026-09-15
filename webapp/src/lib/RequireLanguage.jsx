import { Navigate } from 'react-router-dom';
import { hasLanguage } from './lang';

// Guards routes that require a language to already be chosen (e.g. the
// scenario menu), redirecting back to /language if someone lands here
// directly without one set yet.
export function RequireLanguage({ children }) {
  if (!hasLanguage()) return <Navigate to="/language" replace />;
  return children;
}
