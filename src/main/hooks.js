// --- useState ------------------------------------------------------

export function useState(c, initialState) {
  const
    state = Object.assign({}, initialState),

    setState = (arg1, arg2) => {
      let updater

      if (typeof arg1 !== 'string') {
        updater = arg1
      } else if (typeof arg2 !== 'function') {
        updater = { [arg1]: arg2 }
      } else {
        updater = state => ({
          [arg1]: arg2(state[arg1])
        })
      } 

      c.runOnceBeforeUpdate(() => {
        Object.assign(state, typeof updater === 'function'
          ? updater(state)
          : updater
        )
      })

      c.update()
    }

  return [state, setState]
}

// --- useValue ------------------------------------------------------

export function useValue(c, initialValue) {
  const
    value = { value: initialValue },

    setValue = updater => {
      c.runOnceBeforeUpdate(() => {
        value.value = typeof updater === 'function'
          ? updater(value.value)
          : updater
      })

      c.update()
    }

  return [value, setValue]
}

// --- useContext ----------------------------------------------------

export function useContext(c, context) {
  const ret = { value: undefined }

  c.beforeUpdate(() => {
     ret.value = c.getContextValue(context)
  })

  return ret
}

// --- useEffect -----------------------------------------------------

export function useEffect(c, action, getDeps) {
  let
    oldDeps = null,
    cleanup

  if (getDeps === null) {
    c.afterMount(() => { cleanup = action() })
    c.beforeUnmount(() => { cleanup && cleanup() }) 
  } else if (getDeps === undefined || typeof getDeps === 'function'){
    const callback = () => {
      let needsAction = getDeps === undefined

      if (!needsAction) {
        const newDeps = getDeps()

        needsAction = oldDeps === null || newDeps ===  null || !isEqualArray(oldDeps, newDeps)
        oldDeps = newDeps
      }

      if (needsAction) {
        cleanup && cleanup()
        cleanup = action()
      }
    }

    c.afterMount(callback)
    c.afterUpdate(callback)
  } else {
    throw new TypeError(
      '[useEffect] Third argument must either be undefined, null or a function')
  }
}

// --- useInterval ---------------------------------------------------

export function useInterval(c, callback, delay) {
  const
    callbackRef = asRef(callback),
    delayRef = asRef(delay)
  
  useEffect(c, () => {
    const id = setInterval(callbackRef.current, delayRef.current)

    return () => clearInterval(id)
  }, () => [callbackRef.current, delayRef.current])
}

// --- useMemo -------------------------------------------------------

export function useMemo(c, getValue, getDeps) {
  let oldDeps = getDeps()

  const memo = { value: getValue.apply(null, oldDeps) }

  c.beforeUpdate(() => {
    const newDeps = getDeps()

    if (!isEqualArray(oldDeps, newDeps)) {
      oldDeps = newDeps
      memo.value = getValue.apply(null, newDeps)
    }
  })

  return memo
}

// --- locals --------------------------------------------------------

function isEqualArray(arr1, arr2) {
  let ret = Array.isArray(arr1) && Array.isArray(arr2) && arr1.length === arr2.length

  if (ret) {
    for (let i = 0; i < arr1.length; ++i) {
      if (arr1[i] !== arr2[i]) {
        ret = false
        break
      }
    }
  }

  return ret
}

function asRef(arg) {
  return arg && Object.prototype.hasOwnProperty.call(arg, 'current')
    ? arg
    : { current: arg }
}
