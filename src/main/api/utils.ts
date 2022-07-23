// === exports =======================================================

export { asRef, toRef };

// === asRef =========================================================

function asRef<T>(arg: { current: T } | T): { current: T } {
  return arg instanceof RefClass ? arg : new RefClass(arg);
}

// === toRef =========================================================

function toRef<T>(getValue: () => T): { current: T } {
  const ref = new RefClass(getValue());

  Object.defineProperty(ref, "current", {
    enumerable: true,
    get: getValue,

    set: () => {
      throw new Error("<ref>.value is read-only");
    },
  });

  return ref;
}

// --- locals --------------------------------------------------------

class RefClass<T> {
  current: T;

  constructor(initialValue: T) {
    this.current = initialValue;
  }
}
