import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);

    const handler = (e: MediaQueryListEvent): void => {
      setIsDesktop(e.matches);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
