import { Context } from 'preact'
import Props from './Props'

export default Ctrl

type Ctrl<P extends Props = {}> = {
  getDisplayName() : string,
  getProps(): P,
  isInitialized(): boolean,
  isMounted(): boolean,
  getContextValue<T>(ctx: Context<T>): T,
  refresh(runOnceBeforeUpdate?: Action): void,
  afterMount(action: Action): void
  beforeUpdate(action: Action): void
  afterUpdate(action: Action): void
  beforeUnmount(action: Action): void
}

type Action = () => void
