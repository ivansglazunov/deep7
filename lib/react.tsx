"use client"

import { createContext, useContext, useEffect, useState } from "react";
import { newDeep } from "./deep";

const DeepContext = createContext<any>(null);

export function DeepProvider({ children }: { children: React.ReactNode }) {
  const [deep, setDeep] = useState<any>(null);

  useEffect(() => {
    setDeep(newDeep());
  }, []);

  return <DeepContext.Provider value={deep}>{children}</DeepContext.Provider>;
}

export function useDeep() {
  return useContext(DeepContext);
}
