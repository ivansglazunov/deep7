// Polyfill for Set.prototype.difference
if (!(Set.prototype as any).difference) {
  Object.defineProperty(Set.prototype, 'difference', {
    value: function(other: Set<any>): Set<any> {
      const result = new Set(this);
      for (const value of other) {
        result.delete(value);
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
}

// Polyfill for Set.prototype.intersection
if (!(Set.prototype as any).intersection) {
  Object.defineProperty(Set.prototype, 'intersection', {
    value: function(other: Set<any>): Set<any> {
      const result = new Set();
      for (const value of this) {
        if (other.has(value)) {
          result.add(value);
        }
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
}

// Polyfill for Set.prototype.union
if (!(Set.prototype as any).union) {
  Object.defineProperty(Set.prototype, 'union', {
    value: function(other: Set<any>): Set<any> {
      const result = new Set(this);
      for (const value of other) {
        result.add(value);
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
} 