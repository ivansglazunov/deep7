export type DebuggerFunction = (...args: any[]) => void;

/**
 * Safe JSON.stringify with circular reference protection for debug output
 */
function safeStringifyForDebug(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error: any) {
    if (error.message.includes('circular')) {
      return `[Circular Object: ${Object.prototype.toString.call(obj)}]`;
    }
    return `[Stringify Error: ${error.message}]`;
  }
}

/**
 * Debug utility factory.
 *
 * Always returns a debugger function for the specified namespace.
 * If no namespace is provided, uses 'app' as the default.
 *
 * @param namespace - Namespace for the debugger.
 * @returns A debugger function for the specified namespace.
 */
function Debug(namespace?: string): DebuggerFunction {
  const fullNamespace = `hasyx:${namespace || 'app'}`;
  
  return (...args: any[]) => {
    if (process.env.DEBUG) {
      const message = `[${fullNamespace}] ${args.map(arg => 
        typeof arg === 'object' ? safeStringifyForDebug(arg) : String(arg)
      ).join(' ')}\n`;
      process.stderr.write(message);
    }
  };
}

// Export as default and also as module.exports for compatibility
export default Debug;

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Debug;
  module.exports.default = Debug;
} 