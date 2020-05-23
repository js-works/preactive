import { Component, options, VNode, Context, Component as PreactComponent, ComponentType, FunctionComponent } from 'preact'
import {} from 'preact/compat'
import Ctrl from './types/Ctrl'
import Props from './types/Props'

const oldDiffHook = (options as any)._diff;

// Brrrr, this is horrible as hell - please fix asap!!!!
const
  isMinimized = Component.name !== 'Component',
  keyContextId = isMinimized ? '__c' : '_id',
  keyContextDefaultValue = isMinimized ? '__' : '_defaultValue'

if (process.env.NODE_ENV === 'development' as any) {
  const oldVnode = options.vnode

  options.vnode = vnode => {
    let
      type: any = vnode && vnode.type, // TODO
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

// --- stateless -----------------------------------------------------

export function stateless<P extends Props = {}>(
  displayName: string,
  render: (prop: P) => VNode
): FunctionComponent<P> {
  if (process.env.NODE_ENV === 'development' as any) {
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

// --- stateful ------------------------------------------------------

export function stateful<P extends Props = {}>(
  displayName: string,
  init: (c: Ctrl<P>) => (props: P) => VNode
): ComponentType<P> {
  if (process.env.NODE_ENV === 'development' as any) {
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

  class CustomComponent extends PreactComponent<P>{
    constructor(props: P) {
      super(props)
      this.props = props

      let
        mounted = false,
        initialized = false

      const
        afterMountNotifier = createNotifier(),
        beforeUpdateNotifier = createNotifier(),
        afterUpdateNotifier = createNotifier(),
        beforeUnmountNotifier = createNotifier(),
        runOnceBeforeUpdateTasks = [] as Action[],

        ctrl: Ctrl<P> = {
          getDisplayName: () => displayName,
          getProps: () => this.props,
          isMounted: () => mounted,
          isInitialized: () => initialized,

          refresh: (runOnceBeforeUpdate: Action) => {
            if (runOnceBeforeUpdate) {
              runOnceBeforeUpdateTasks.push(runOnceBeforeUpdate)
            }

            this.forceUpdate()
          },

          getContextValue: (ctx: Context<any>) => {
            const provider = (this as any).context[(ctx as any)[keyContextId]]

            return  !provider ? (ctx as any)[keyContextDefaultValue] : provider.props.value
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
console.log(displayName, (this as any))
        return render(this.props as any) // TODO
      }
    }

    render() {
      return null as any as VNode // will be overridden in the constructor
    }
  }

  CustomComponent.prototype = Object.create(Component.prototype)

  setPropValue(CustomComponent, 'name', displayName)
  setPropValue(CustomComponent, 'displayName', displayName)

  return CustomComponent as ComponentType<P>
}

// --- locals --------------------------------------------------------

function setPropValue(obj: object, propName: string, value: any) {
  Object.defineProperty(obj, propName, { value })
}

function createNotifier() {
  const subscribers: Action[] = []

  return {
    notify: () => subscribers.forEach(it => it()),
    subscribe: (subscriber: Action) => subscribers.push(subscriber)
  }
}

// --- types ---------------------------------------------------------

type Action = () => void
