// Implements reasons system for Deep framework, replacing static enum with dynamic Deep instances
// Each reason represents an operation context within the Deep framework

/**
 * Creates the Reason type and predefined reason instances
 * @param deep The Deep factory
 * @returns The reasons instance
 */
export function newReasons(deep: any) {
  // Create the Reason type
  const Reason = new deep();
  deep._contain.Reason = Reason;
  
  // Create the reasons container
  const reasons = new deep();
  deep._contain.reasons = reasons;

  reasons._contain.construct = new Reason();
  reasons._contain.apply = new Reason();
  reasons._contain.getter = new Reason();
  reasons._contain.setter = new Reason();
  reasons._contain.deleter = new Reason();
  reasons._contain.typed = new Reason();
  reasons._contain.in = new Reason();
  reasons._contain.out = new Reason();
  reasons._contain.valued = new Reason();
  reasons._contain.construction = new Reason();
  reasons._contain.destruction = new Reason();
  
  return reasons;
} 