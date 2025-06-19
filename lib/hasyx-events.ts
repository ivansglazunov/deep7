// Implements Hasyx associative events system for Deep Framework
// Provides deep.On, deep.Listener, and deep.Emit for database-driven event handling

export function newHasyxEvents(deep: any) {
  // Create deep.Listener type if it doesn't exist
  if (!deep._contain.Listener) {
    const Listener = new deep();
    deep._contain.Listener = Listener;
  }

  // Create deep._contain.On - returns deep.Listener
  const On = new deep.Function(function On(this: any, reason: any, eventAssociation: any, handlerFunction: any) {
    // Validate and prepare handler function
    let handlerAssoc;
    if (handlerFunction instanceof deep.Deep) {
      if (!handlerFunction.type?.is(deep.Function)) {
        throw new Error('Handler association must be of type Function');
      }
      handlerAssoc = handlerFunction;
    } else if (typeof handlerFunction === 'function') {
      handlerAssoc = new deep.Function(handlerFunction);
    } else {
      throw new Error('Handler must be function or Deep Function association');
    }

    // Create new Listener association
    const listener = new deep.Listener();
    listener.value = eventAssociation;     // Event to listen for
    listener.from = reason;                // What watches for events  
    listener.to = handlerAssoc;           // Handler function to execute
    
    return listener;
  });

  // Create deep._contain.Emit - emits events to trigger handlers
  const Emit = new deep.Function(function Emit(this: any, reason: any, eventAssociation: any, ...args: any[]) {
    // Find all listeners for this event in current deep space
    const listeners = Array.from(deep._ids as Set<string>)
      .map((id: string) => deep(id))
      .filter((assoc: any) => 
        assoc.type?.is(deep.Listener) && 
        assoc.value?._id === eventAssociation._id
      );

    // Execute each listener's handler
    for (const listener of listeners) {
      try {
        const handler = listener.to;
        if (handler && handler._data && typeof handler._data === 'function') {
          handler._data(...args);
        }
      } catch (error) {
        console.error(`Error executing listener ${listener._id}:`, error);
      }
    }
  });

  // Register in context
  deep._contain.On = On;
  deep._contain.Emit = Emit;
  
  return { On, Emit };
} 