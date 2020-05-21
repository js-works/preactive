/** @jsx h */
import { h, createContext } from 'preact'

import {
  stateful, handler, withContext, withEffect, withInterval, withMemo, withValue,
  toRef, withProps, withState
} from '../main'

export default {
  title: 'Demos'
}

export const counterDemo = () => <CounterDemo/>
export const clockDemo = () => <ClockDemo/>
export const memoDemo = () => <MemoDemo/>
export const intervalDemo = () => <IntervalDemo/>
export const contextDemo = () => <ContextDemo/>

// === Counter demo ==================================================

const CounterDemo = stateful('CounterDemo', c => {
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
      <h3>Counter demo 1:</h3>
      <label>{props.label}: </label>
      <input type="number" value={count.value} onInput={onInput} />
      <button onClick={onIncrement}>{count.value}</button>
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
