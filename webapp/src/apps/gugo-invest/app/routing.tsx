import { createContext, useCallback, useContext, type ReactNode } from "react";
import { NavLink, useNavigate, type NavLinkProps } from "react-router-dom";

/**
 * Mounting this app inside the CIBAR webapp took away the one thing every
 * screen assumed: that GuGo owns the whole URL.
 *
 * Standalone, it ran its own HashRouter at the root, so `navigate("/markets")`
 * and `<NavLink to="/portfolio">` were correct as written. Inside webapp the
 * app is a descendant of webapp's HashRouter (React Router refuses a second
 * Router outright), mounted under some host path, so those same absolute
 * paths would jump clean out of the app and land on a webapp route.
 *
 * Rather than rewrite eleven navigations - and lose the ability to compare
 * this source against the standalone app line by line - the base path the
 * host mounted at is carried in context, and the two navigation primitives
 * are wrapped to prefix it. Call sites keep reading exactly as before, with
 * the app's own routes still spelled absolutely: "/", "/markets",
 * "/stock/2330". Relative navigation (`navigate(-1)`) passes straight
 * through, since history steps are not paths.
 */
const GuGoBasePathContext = createContext("/");

export function GuGoBasePathProvider({ basePath, children }: { basePath: string; children: ReactNode }) {
  return <GuGoBasePathContext.Provider value={basePath}>{children}</GuGoBasePathContext.Provider>;
}

/** Joins the host mount path with one of this app's own absolute routes. */
export function useGuGoPath(): (to: string) => string {
  const basePath = useContext(GuGoBasePathContext);
  return useCallback((to: string) => `${basePath.replace(/\/+$/, "")}/${to.replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/"), [basePath]);
}

/** Drop-in for react-router's useNavigate, scoped to this app's routes. */
export function useGuGoNavigate() {
  const navigate = useNavigate();
  const resolve = useGuGoPath();
  return useCallback(
    (to: string | number, options?: { replace?: boolean }) =>
      typeof to === "number" ? navigate(to) : navigate(resolve(to), options),
    [navigate, resolve],
  );
}

/** Drop-in for react-router's NavLink, scoped to this app's routes. */
export function GuGoNavLink({ to, ...rest }: Omit<NavLinkProps, "to"> & { to: string }) {
  const resolve = useGuGoPath();
  return <NavLink to={resolve(to)} {...rest} />;
}
