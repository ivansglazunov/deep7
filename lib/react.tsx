"use client";

import { useHasyx } from 'hasyx';
import React from 'react';
import { newDeep } from './deep';
import { restoreDeep } from './storage-hasyx';

const { createContext, useContext, useEffect, useState, useMemo } = React;

// 1. Create a context for the deep instance
const DeepContext = createContext<any>(null);

// 2. Create a provider component
export function DeepProvider({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  const [deep, setDeep] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasyx = useHasyx();

  useEffect(() => {
    // Check if the component has the 'id' prop, even if its value is undefined
    if (id !== undefined) {
      if (typeof id !== 'string' || !id) {
        setError(new Error('DeepProvider id prop must be a non-empty string.'));
        setLoading(false);
        return;
      }

      setLoading(true);
      restoreDeep({ id, hasyx }).then(({ deep: restoredDeep, storage }) => {
        restoredDeep.state.storage = storage;
        setDeep({ deep: restoredDeep });
        setLoading(false);
      }).catch(err => {
        setError(err);
        setLoading(false);
      });
    } else {
      // No id prop, create a new deep instance
      try {
        const newInstance = newDeep();
        setDeep({ deep: newInstance });
      } catch (e) {
        setError(e as any);
      }
      setLoading(false);
    }
  }, [id, hasyx]);

  if (loading) {
    return <div>Loading deep...</div>;
  }

  if (error) {
    return <div>Error loading deep: {error.message}</div>;
  }

  if (deep) {
    return (
      <DeepContext.Provider value={deep}>
        {children}
      </DeepContext.Provider>
    );
  }

  return null; // Don't render children if deep is not available
}

// 3. Create a custom hook to use the deep context
export function useDeep() {
  const context = useContext(DeepContext);
  if (context?.deep === null) {
    throw new Error('useDeep must be used within a DeepProvider');
  }
  return context?.deep;
}

// 4. Create useAll hook
export function useAll() {
  const deep = useDeep();
  console.log('DEEP', deep);
  const [all, setAll] = useState(() => Array.from(deep?._ids || []).map((id: any) => (deep(id))));

  // useEffect(() => {
  //   if (!deep) return;

  //   const regenerate = () => {
  //     setAll(Array.from(deep._ids).map((id: any) => (deep(id))));
  //   };

  //   regenerate();

  //   const constructedHandler = deep.on(deep.events.globalConstructed, regenerate);
  //   const destroyedHandler = deep.on(deep.events.globalDestroyed, regenerate);

  //   return () => {
  //     constructedHandler();
  //     destroyedHandler();
  //   };
  // }, []);

  const result = useMemo(() => all.filter(d => (
    d._type !== deep.String._id && d._type !== deep.Number._id && d._type !== deep.Function._id
  )).map(d => ({ id: d._id, deep: d })), [all]);

  return result;
}
