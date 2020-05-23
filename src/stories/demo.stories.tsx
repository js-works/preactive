/** @jsx h */
import { h, createContext, RefObject } from 'preact'

import {
  asRef, stateful, handler, refresh, withContext, withEffect, withInterval, withMemo,
  withMethods, withPromise, withValue,
  toRef, withProps, withState
} from '../main'

export default {
  title: 'Demos'
}

export const simpleCounterDemo = () => <SimpleCounterDemo/>
export const complexCounterDemo = () => <ComplexCounterDemo/>
export const clockDemo = () => <ClockDemo/>
export const memoDemo = () => <MemoDemo/>
export const intervalDemo = () => <IntervalDemo/>
export const contextDemo = () => <ContextDemo/>
export const promiseDemo = () => <PromiseDemo/>

// === Simple counter demo ===========================================

type SimpleCounterProps = {
  initialCount?: number,
  label?: string,
  
  ref?: {
    reset(n: number): void
  }
}

const SimpleCounterDemo = stateful<SimpleCounterProps>('SimpleCounterDemo', c => {
  const
    props = withProps(c, {
      initialCount: 0,
      label: 'Counter'
    }),

    [count, setCount] = withValue(c, props.initialCount),
    onIncrement = () => setCount(it => it + 1),
    onInput = (ev: any) => setCount(ev.currentTarget.valueAsNumber) // TODO

  withEffect(c, () => {
    console.log(`Value of "${props.label}" is now ${count.value}`)
  }, () => [count.value])

  return () =>
    <div>
      <h3>Simple counter demo:</h3>
      <label>{props.label}: </label>
      <input type="number" value={count.value} onInput={onInput} />
      <button onClick={onIncrement}>{count.value}</button>
    </div>
})

// === Complex counter demo ==========================================

type ComplexCounterProps = {
  initialCount?: number,
  label?: string,

  componentRef?: RefObject<{
    reset(n: number): void
  }>
}

const ComplexCounter = stateful<ComplexCounterProps>('ComplexCounter', c => {
  const
    props = withProps(c, {
      initialCount: 0,
      label: 'Counter'
    }),

    [count, setCount] = withValue(c, props.initialCount),
    onIncrement = () => setCount(it => it + 1),
    onDecrement = () => setCount(it => it - 1)
  
  withMethods(c, 'componentRef', {
     reset(n: number) {
      setCount(n)
    }
  })
  
  return () =>
    <div>
      <h3>Complex counter demo:</h3>
      <label>{props.label}: </label>
      <button onClick={onDecrement}>-</button>
      {` ${count.value} `}
      <button onClick={onIncrement}>+</button>
    </div>
})

const ComplexCounterDemo = stateful('ComplexCounterDemo', c => {
  const
    counterRef: any = asRef<ComplexCounterProps['componentRef'] | null>(null), // TODO
    onResetToZeroClick = () => counterRef.current.reset(0),
    onResetToOneHundredClick = () => counterRef.current.reset(100)

  return () =>
    <div>
      <ComplexCounter componentRef={counterRef}/>
      <br/>
      <button onClick={onResetToZeroClick}>Reset to 0</button>
      <button onClick={onResetToOneHundredClick}>Reset to 100</button>
    </div>
})

// === Clock demo ====================================================

const ClockDemo = stateful('ClockDemo', c => {
  const time = withTime(c)

  return () =>
    <div>
      <h3>Clock demo:</h3>
      Current time: {time.value}
    </div>
})

function getTime() {
  return new Date().toLocaleTimeString()
}

const withTime = handler('withTime', c => {
  const [time, setTime] = withValue(c, getTime())

  withInterval(c, () => {
    setTime(getTime())
  }, 1000)

  return time
})

// === Memo demo =====================================================

const MemoDemo = stateful('MemoDemo', c => {
  const
    [state, setState] = withState(c, { count: 0 }),
    onButtonClick = () => setState({ count: state.count + 1 }),

    memo = withMemo(c,
      () => 'Last time the memoized value was calculated: ' + new Date().toLocaleTimeString(),
      () => [Math.floor(state.count / 5)])

  return () =>
    <div>
      <h3>Memoization demo:</h3>
      <button onClick={onButtonClick}>
        Every time you've clicked this button 5 times<br/>
        the memoized calculation will be performed again
      </button>
      <p>
        {memo.value}
      </p>
    </div>
})

// === Interval demo =================================================

const IntervalDemo = stateful('IntervalDemo', c => {
  const
    [state, setState] = withState(c, {
      count: 0,
      delay: 1000
    }),

    onReset = () => setState('delay', 1000)

  withInterval(c, () => {
    setState('count', it => it + 1)
  }, toRef(() => state.delay))

  withInterval(c, () => {
    if (state.delay > 10) {
      setState('delay', it => it /= 2)
    }
  }, 1000)

  return () =>
    <div>
      <h3>Interval demo:</h3>
      <div>Counter: {state.count}</div>
      <div>Delay: {state.delay}</div>
      <br/>
      <button onClick={onReset}>
        Reset delay
      </button>
    </div>
})

// === Context demo ==================================================

const translations = {
  en: {
    salutation: 'Hello, ladies and gentlemen!'
  },
  de: {
    salutation: 'Hallo, meine Damen und Herren!'
  },
  fr: {
    salutation: 'Salut, Mesdames, Messieurs!'
  }
}

const LocaleCtx = createContext('en')

const ContextDemo = stateful('ContextDemo', c => {
  const
    [state, setState] = withState(c, { locale: 'en' }),
    onLocaleChange = (ev: any) =>setState({ locale: ev.target.value })

  return () => (
    <LocaleCtx.Provider value={state.locale}>
      <h3>Context demo:</h3>
      <div>
        <label htmlFor="lang-selector">Select language: </label>
        <select id="lang-selector" value={state.locale} onChange={onLocaleChange}>
          <option value="en">en</option>
          <option value="fr">fr</option>
          <option value="de">de</option>
        </select>
        <LocaleText id="salutation"/>
      </div>
    </LocaleCtx.Provider>
  )
})

type LocaleTextProps = {
  id: string
}

const LocaleText = stateful<LocaleTextProps>('LocaleText', c => {
  const
    props = withProps(c),
    locale = withContext(c, LocaleCtx)

  return () => (
    <p>
      { (translations as any)[locale.value][props.id] } { /* // TODO */ } 
    </p>
  )
})

// === promise demo ==================================================

type LoaderProps = {
  loadingText?: string,
  finishText?: string
}

const Loader = stateful<LoaderProps>('DataLoad', c => {
  const
    props = withProps(c),
    res = withPromise(c, () => wait(4000))

  return () => res.state === 'pending'
    ? <div>{props.loadingText}</div>
    : <div>{props.finishText}</div>
})

const PromiseDemo = stateful('PromiseDemo', c => {
  const
    [state, setState] = withState(c, {
      key: 0,
      loadingText: 'Loading...',
      finishText: 'Finished!'
    }),

    onRefresh = () => refresh(c),
    onRestart = () => setState('key', (it: any) => it + 1), // TODO

    onToggleLoadingText = () => setState('loadingText',
      (it: any) => it === 'Loading...' ? 'Please wait...' : 'Loading...'), // TODO

    onToggleFinishText = () => setState('finishText',
      (it: any) => it === 'Finished!' ? 'Done!' : 'Finished!') // TODO

  return () => (
    <div>
      <h3>Promise demo (last update {getTime()})</h3>
      <section>
        <Loader key={state.key} loadingText={state.loadingText} finishText={state.finishText}/>
      </section>
      <br />
      <button onClick={onRefresh}>Refresh</button>
      <button onClick={onRestart}>Restart</button>
      <button onClick={onToggleLoadingText}>Toggle loading text</button>
      <button onClick={onToggleFinishText}>Toggle finish text</button>
    </div>
  )
})

function wait(ms: number) {
  return new Promise(resolve =>
    setTimeout(() => resolve(), ms))
}
