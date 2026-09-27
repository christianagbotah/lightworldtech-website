/**
 * Intentionally silent route fallback.
 *
 * PublicShell owns the one branded loading experience via <Preloader />.
 * Rendering another full-screen loader here causes two sequential loaders on
 * first load (Next route fallback, then the hydrated branded preloader).
 */
export default function Loading() {
  return null;
}