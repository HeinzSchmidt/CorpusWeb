/**
 * Resolves a home-page section link for the current route.
 *
 * Home sections (#top, #what-is-corpus, #features, #security, #upgrade,
 * #contact) only exist on "/" — from any other route (e.g. /docs) a bare
 * "#features" would point at nothing on that page. From off-home routes we
 * therefore link to "/#features": a fresh SPA load onto home, where
 * src/App.tsx scrolls to the hash after mount. Path-only links (/docs) are
 * never passed here.
 */
export function homeSectionHref(sectionId: string, pathname: string): string {
  return pathname === '/' || pathname === '' ? `#${sectionId}` : `/#${sectionId}`;
}
