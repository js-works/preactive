import { Component, options } from 'preact'

// Brrrr, this is horrible as hell - please fix asap!!!!
const
  isMinimized = Component.name !== 'Component',
  keyContextId = isMinimized ? '__c' : '_id',
  keyContextDefaultValue = isMinimized ? '__' : '_defaultValue'

if (process.env.NODE_ENV === 'development') {
  const oldVnode = options.vnode

  options.vnode = vnode => {
    let
      type = vnode && vnode.type,
      validate = typeof type === 'function' && type['js-preactive:validate']
    
    if (validate) {
      const result = validate(vnode.props)

      let errorMsg = null

      if (result === false) {
        errorMsg = 'Invalid value'
      } else if (result !== true && result !== null && result !== undefined) {
        errorMsg = result.message || 'Invalid value'
      }

      if (errorMsg) {
        throw new TypeError('Prop validation error for component "'
          + type.displayName + '" => ' + errorMsg)
      }
    }

    return oldVnode
      ? oldVnode(vnode)
      : vnode
  }
}

// --- constants -----------------------------------------------------

const
  REGEX_DISPLAY_NAME = /^[A-Z][a-zA-Z0-9]*$/

// --- statelessComponent --------------------------------------------

export function statelessComponent(displayName, render) {
  if (process.env.NODE_ENV === 'development') {
    let errorMsg

    if (typeof displayName !== 'string') {
      errorMsg = 'First argument must be a string'
    } else if (!(displayName.match(REGEX_DISPLAY_NAME))) {
      errorMsg = `Invalid component display name "${displayName}"`
    } else if (typeof render !== 'function') {
      errorMsg = 'Expected function as second argument'
    }

    if (errorMsg) {
      throw new TypeError(
        'Error when defining stateless component'
          + (displayName ? ` "${displayName}": ` : ': ')
          + errorMsg)
    }
  }

  let ret = render.bind(null)

  setPropValue(ret, 'name', displayName)
  setPropValue(ret, 'displayName', displayName)

  return ret
}

// --- statefulComponent ---------------------------------------------

export function statefulComponent(displayName, init) {
  if (process.env.NODE_ENV === 'development') {
    let errorMsg

    if (typeof displayName !== 'string') {
      errorMsg = 'First argument must be a string'
    } else if (!(displayName.match(REGEX_DISPLAY_NAME))) {
      errorMsg = `Invalid component display name "${displayName}"`
    } else if (typeof init !== 'function') {
      errorMsg = 'Expected function as second argument'
    }

    if (errorMsg) {
      throw new TypeError(
        'Error when defining stateful component'
          + (displayName ? ` "${displayName}": ` : ': ')
          + errorMsg)
    }
  }

  const CustomComponent = function (props) {
    this.props = props

    let
      mounted = false,
      initialized = false

    const
      afterMountNotifier = createNotifier(),
      beforeUpdateNotifier = createNotifier(),
      afterUpdateNotifier = createNotifier(),
      beforeUnmountNotifier = createNotifier(),
      runOnceBeforeUpdateTasks = [],

      ctrl = {
        getDisplayName: () => displayName,
        getProps: () => this.props,
        isMounted: () => mounted,
        isInitialized: () => initialized,

        refresh: runOnceBeforeUpdate => {
          if (runOnceBeforeUpdate) {
            runOnceBeforeUpdateTasks.push(runOnceBeforeUpdate)
          }

          this.forceUpdate()
        },

        getContextValue: ctx => {
          const provider = this.context[ctx[keyContextId]]

          return  !provider ? ctx[keyContextDefaultValue] : provider.props.value
        },

        afterMount: afterMountNotifier.subscribe,
        beforeUpdate: beforeUpdateNotifier.subscribe,
        afterUpdate: afterUpdateNotifier.subscribe,
        beforeUnmount: beforeUnmountNotifier.subscribe,
        //runOnceBeforeUpdate: task => runOnceBeforeUpdateTasks.push(task)
      },

      render = init(ctrl)
    
    initialized = true

    this.componentDidMount = () => {
      mounted = true
      afterMountNotifier.notify()
    }

    this.componentDidUpdate = afterUpdateNotifier.notify
    this.componentWillUnmount = beforeUnmountNotifier.notify

    this.render = () => {
      const taskCount = runOnceBeforeUpdateTasks.length

      for (let i = 0; i < taskCount; ++i) {
        runOnceBeforeUpdateTasks[i]()
      }

      if (taskCount === runOnceBeforeUpdateTasks.length) {
        runOnceBeforeUpdateTasks.length = 0
      } else {
        runOnceBeforeUpdateTasks.splice(0, taskCount)
      }

      beforeUpdateNotifier.notify()

      return render(this.props)
    }
  }

  CustomComponent.prototype = Object.create(Component.prototype)
  setPropValue(CustomComponent, 'name', displayName)
  setPropValue(CustomComponent, 'displayName', displayName)

  return CustomComponent
}

// --- locals --------------------------------------------------------

function setPropValue(obj, propName, value) {
  Object.defineProperty(obj, propName, { value })
}

function createNotifier() {
  const subscribers = []

  return {
    notify: () => subscribers.forEach(it => it()),
    subscribe: subscriber => subscribers.push(subscriber)
  }
}
