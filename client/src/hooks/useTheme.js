import { useEffect, useState } from 'react';

/** Dark-first theme with persistence. The initial value is already applied to
 *  <html> by an inline script in index.html to avoid a flash. */
export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('archforge-theme', theme); } catch {}
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
