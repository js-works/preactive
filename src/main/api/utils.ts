import { Context } from 'preact'
import Ctrl from './types/Ctrl'

// --- asRef ---------------------------------------------------------

export function asRef<T>(arg: { current: T } | T): { current: T } {
  return (arg instanceof RefClass)
    ? arg
    : new RefClass(arg)
}

// --- toRef ---------------------------------------------------------

export function toRef<T>(getter: () => T): { current: T } {
  const ref = Object.create(RefClass.prototype)

  Object.defineProperty(ref, 'current', {
    enumerable: true,
    get: getter,
    set: () => {
      throw new Error('<ref>.current is read-only')
    }
  })

  return ref
}

// --- isMounted -----------------------------------------------------

export function isMounted(c: Ctrl) {
  return c.isMounted()
}

// --- refresh ---------------------------------------------------

export function refresh(c: Ctrl) {
  c.refresh()
}

// --- getContextValue -----------------------------------------------

export function getContextValue<T>(c: Ctrl, ctx: Context<T>, defaultValue: T) {
  let ret = c.getContextValue(ctx)

  if (ret === undefined) {
    ret = defaultValue
  }

  return ret
}

// --- locals --------------------------------------------------------

class RefClass<T> {
  current: T
  
  constructor(initialValue: T) {
    this.current = initialValue
  }
}
