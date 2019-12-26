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

// --- forceUpdate ---------------------------------------------------

export function forceUpdate(c) {
  c.update()
}

// --- getContextValue -----------------------------------------------

export function getContextValue(c, ctx, defaultValue) {
  let ret = c.getContextValue(ctx)

  if (ret === undefined) {
    ret = defaultValue
  }

  return ret
}

// --- getComponentStore ---------------------------------------------

export function componentStore(initMethods, initState) {
  return function useStore(c, ...args) {
    let state =
      typeof initState === 'function'
        ? initState(...args)
        : initState && typeof initState === 'object'
          ? initState
          : {}

    const
      store = {},

      setState = (arg1, arg2) => {
        if (typeof arg1 === 'string') {
          if (typeof arg2 === 'function') {
            setState(state => ({ [arg1]: arg2(state[arg1]) }))
          } else {
            setState(() => ({ [arg1]: arg2 }))
          }
        } else if (typeof arg1 !== 'function') {
          setState(() => arg1)
        } else {
          c.update(() => {
            state = Object.assign({}, state, arg1(state))
          })
        }
      },

      getState = () => state,
      methods = initMethods(setState, getState)
    
    Object.keys(methods).forEach(key => {
      store[key] = (...args) => methods[key](state, ...args)
    })

    return store
  }
}
