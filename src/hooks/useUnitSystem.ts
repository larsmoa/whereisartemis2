import { useState, useEffect } from "react";
import type { UnitSystem } from "@/lib/format";

const STORAGE_KEY = "artemis-unit-system";

export function useUnitSystem(): {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
} {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>("metric");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "metric" || stored === "us") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUnitSystemState(stored);
      } else {
        // Fallback to US if locale is en-US
        if (navigator.language === "en-US") {
          setUnitSystemState("us");
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setUnitSystem = (system: UnitSystem): void => {
    setUnitSystemState(system);
    try {
      localStorage.setItem(STORAGE_KEY, system);
    } catch {
      // Ignore storage errors
    }
  };

  return { unitSystem, setUnitSystem };
}
