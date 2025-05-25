"use client"

import { createContext, useContext, useEffect, useState } from "react";
import { newDeep } from "./deep";

const _deep = newDeep();

const DeepContext = createContext<any>(null);

export function DeepProvider({ children }: { children: React.ReactNode }) {
  const [deep, setDeep] = useState<any>(null);

  useEffect(() => {
    const _deep = newDeep();
    console.log('deep', _deep);
    setDeep(_deep);
  }, []);

  return <DeepContext.Provider value={_deep}>{children}</DeepContext.Provider>;
}

export function useDeep() {
  return useContext(DeepContext);
}
