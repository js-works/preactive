import { ComponentType, Context, VNode } from 'preact'

// --- exports -------------------------------------------------------

export {
    // general
    Props,
    VirtualElement,
    VirtualNode,
    Context,
    Ref,
    R,

    // core
    statelessComponent,
    statefulComponent,

    // utils
    asRef,
    toRef,
    isMounted,
    refresh,
    getContextValue,

    // hooks
    useValue,
    useState,
    useMemo,
    useContext,
    useEffect,
    useInterval
}

// --- core ----------------------------------------------------------

type Props = Record<string, any>
type VirtualElement = VNode
type VirtualNode = VNode | string | number | boolean | Function 
type Component<P extends Props> = ComponentType<P>
type Ref<T> = { current: T }
type R<T> = T | Ref<T>

type Ctrl<P extends Props = {}> = {
  getDisplayName(): string,
  getProps(): P,
  isInitialized(): boolean,
  isMounted(): boolean,
  update(runOnceBeforeUpdate?: () => void): void,
  getContextValue<T>(ctx: Context<T>): T,
  afterMount(subscriber: () => void): void,
  beforeUpdate(subscriber: () => void): void,
  beforeUnmount(subscriber: () => void): void
}

declare function statelessComponent<P extends Props>(
  displayName: string,
  render: (props: P) => VirtualNode
): Component<P>

declare function statefulComponent<P extends Props>(
  displayName: string,
  init: (c: Ctrl) => (props: P) => VirtualNode
): Component<P>

// --- utils ---------------------------------------------------------

declare function asRef<T>(subject: T | Ref<T>): Ref<T>
declare function toRef<T>(getter: () => T): Ref<T>
declare function isMounted(c: Ctrl): boolean
declare function refresh(c: Ctrl): void

declare function getContextValue<T>(
  c: Ctrl,
  context: Context<T | undefined>,
  defaultValue?: T
): T

// --- hooks ---------------------------------------------------------

declare function useValue<T>(c: Ctrl, initialValue: T): { value: T }
declare function useState<S extends Record<string, any>>(c: Ctrl, initialState: S): S
declare function useContext<T>(c: Ctrl, context: Context<T>): { value: T }

declare function useMemo<T, A extends any[]>(
  c: Ctrl,
  getValue: (...args: A) => T,
  getDependencies: () => A
): { value: T }

declare function useEffect<A extends any[]>(
  c: Ctrl,
  action: (...args: A) => void,
  getDependencies: () => A
): void 

declare function useInterval(
  action: R<() => void>,
  milliseconds: R<number>
): void
