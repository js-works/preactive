// --- asRef ---------------------------------------------------------

export function asRef(arg) {
  return arg && Object.prototype.hasOwnProperty.call(arg, 'current')
    ? arg
    : { current: arg }
} 

// --- toRef ---------------------------------------------------------

export function toRef(getter) {
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

export function isMounted(c) {
  return c.isMounted()
}

// --- refresh ---------------------------------------------------

export function refresh(c) {
  c.refresh()
}

// --- getContextValue -----------------------------------------------

export function getContextValue(c, ctx, defaultValue) {
  let ret = c.getContextValue(ctx)

  if (ret === undefined) {
    ret = defaultValue
  }

  return ret
}
