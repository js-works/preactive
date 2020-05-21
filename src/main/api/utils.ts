import { Context, Ref } from 'preact'
import Ctrl from './types/Ctrl'

// --- asRef ---------------------------------------------------------

export function asRef<T>(valueOrRef: T | Ref<T>): Ref<T> {
  return valueOrRef && Object.prototype.hasOwnProperty.call(valueOrRef, 'current')
    ? valueOrRef 
    : { current: valueOrRef as T }
} 

// --- toRef ---------------------------------------------------------

export function toRef<T>(getter: () => T) {
  const ref = {}

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
