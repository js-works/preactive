import { h, createContext } from 'preact'
import * as Spec from 'js-spec/validators'

import {
  statefulComponent, componentStore,
  useContext, useEffect, useInterval, useMemo, useValue,
  toRef, useProps, useState
} from '../main'

export default {
  title: 'Demos'
}

export const counterDemo1 = () => <CounterDemo1/>
export const counterDemo2 = () => <CounterDemo2/>
export const clockDemo = () => <ClockDemo/>
export const memoDemo = () => <MemoDemo/>
export const intervalDemo = () => <IntervalDemo/>
export const contextDemo = () => <ContextDemo/>

// === Counter demo 1 ================================================

const CounterDemo1 = statefulComponent('CounterDemo1', c => {
  const
    props = useProps(c, {
      initialCount: 0,
      label: 'Counter'
    }),

    [count, setCount] = useValue(c, props.initialCount),
    onIncrement = () => setCount(it => it + 1),
    onInput = ev => setCount(ev.currentTarget.valueAsNumber)

  useEffect(c, () => {
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

// === Counter demo 2 ================================================

function initCounterStore(initialValue = 0) {
  return { count: initialValue }
}

const useCounterStore = componentStore(setState => ({
  getCount: state => state.count,
  
  increment: (state, delta = 1) => {
    setState('count', it => it + delta)
  }
}), initCounterStore)

const CounterDemo2 = statefulComponent('CounterDemo2', c => {
  const
    props = useProps(c, {
      initialCount: 0,
      label: 'Counter'
    }),
  
    store = useCounterStore(c, props.initialValue),
    onIncrement = () => store.increment(),
    onInput = ev => state.count = ev.currentTarget.valueAsNumber

  useEffect(c, () => {
    console.log(`Value of "${props.label}" is now ${store.getCount()}`)
  }, () => [store.getCount()])

  return () =>
    <div>
      <h3>Counter demo 2:</h3>
      <input type="number" value={store.getCount()} onInput={onInput} />
      <button onClick={onIncrement}>{store.getCount()}</button>
    </div>
})

// === Clock demo ====================================================

const ClockDemo = statefulComponent('ClockDemo', c => {
  const time = useTime(c)

  return () =>
    <div>
      <h3>Clock demo:</h3>
      Current time: {time.value}
    </div>
})

function getTime() {
  return new Date().toLocaleTimeString()
}

function useTime(c) {
  const [time, setTime] = useValue(c, getTime())

  useInterval(c, () => {
    setTime(getTime())
  }, 1000)

  return time
}

// === Memo demo =====================================================

const MemoDemo = statefulComponent('MemoDemo', c => {
  const
    [state, setState] = useState(c, { count: 0 }),
    onButtonClick = () => setState({ count: state.count + 1 }),

    memo = useMemo(c,
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

const IntervalDemo = statefulComponent('IntervalDemo', c => {
  const
    [state, setState] = useState(c, {
      count: 0,
      delay: 1000
    }),

    onReset = () => setState({ delay: 1000 })

  useInterval(c, () => {
    state.count++
  }, toRef(() => state.delay))

  useInterval(c, () => {
    if (state.delay > 10) {
      state.delay /= 2
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

const ContextDemo = statefulComponent('ContextDemo', c => {
  const
    [state, setState] = useState(c, { locale: 'en' }),
    onLocaleChange = ev =>setState({ locale: ev.target.value })

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

const LocaleText = statefulComponent('LocaleText', c => {
  const
    props = useProps(c),
    locale = useContext(c, LocaleCtx)

  return () => (
    <p>
      { translations[locale.value][props.id] }
    </p>
  )
})
