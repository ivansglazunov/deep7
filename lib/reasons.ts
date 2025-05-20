// Implements reasons system for Deep framework, replacing static enum with dynamic Deep instances
// Each reason represents an operation context within the Deep framework

/**
 * Creates the Reason type and predefined reason instances
 * @param deep The Deep factory
 * @returns The reasons instance
 */
export function newReasons(deep: any, reasonConstructId: string) {
  // Create the Reason type
  const Reason = new deep();
  deep._context.Reason = Reason;
  
  // Create the reasons container
  const reasons = new deep();
  deep._context.reasons = reasons;

  reasons._context.construct = new Reason(reasonConstructId);
  reasons._context.apply = new Reason();
  reasons._context.getter = new Reason();
  reasons._context.setter = new Reason();
  reasons._context.deleter = new Reason();
  reasons._context.typed = new Reason();
  reasons._context.in = new Reason();
  reasons._context.out = new Reason();
  reasons._context.valued = new Reason();
  reasons._context.construction = new Reason();
  reasons._context.destruction = new Reason();
  
  return reasons;
} 