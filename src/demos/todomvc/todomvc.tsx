/** @jsx h */
import { h, render, createRef, RefObject } from "preact";

import {
  refresh,
  stateful,
  stateless,
  withEffect,
  withProps,
  withState,
} from "../../main/index";

import { defineMessages } from "js-messages";
import { createReducer, when } from "js-reducers";
import { update } from "js-immutables";
import { createStore } from "redux";
import { Router, Link } from "preact-router";
// @ts-ignore
import { createHashHistory } from "history";
import classNames from "classnames";
import "preact/debug";

// --- types ---------------------------------------------------------

enum TodoFilter {
  None,
  Active,
  Completed,
}

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

// -------------------------------------------------------------------

const ENTER_KEY = 13;
const ESC_KEY = 27;
const STORAGE_KEY = "todomvc::js-preactive";

const TodoAct = defineMessages("todos", {
  create: (title: string) => ({ title }),
  edit: (id: number, title: string) => ({ id, title }),
  destroy: (id: number) => ({ id }),
  toggle: (id: number, completed: boolean) => ({ id, completed }),
  toggleAll: (completed: boolean) => ({ completed }),
  clearCompleted: null,
});

const todoReducer = createReducer({ todos: [] as Todo[] }, [
  when(TodoAct.create, (state, { title }) =>
    update(state, "todos").push({
      id: state.todos.reduce((max, todo) => Math.max(max, todo.id + 1), 0),
      title,
      completed: false,
    })
  ),

  when(TodoAct.edit, (state, { id, title }) =>
    update(state, "todos").mapFirst(
      (todo) => todo.id === id,
      (todo) => update(todo).set("title", title)
    )
  ),

  when(TodoAct.destroy, (state, { id }) =>
    update(state, "todos").removeFirst((todo) => todo.id === id)
  ),

  when(TodoAct.toggle, (state, { id, completed }) =>
    update(state, "todos").mapFirst(
      (todo) => todo.id === id,
      (todo) => update(todo).set("completed", completed)
    )
  ),

  when(TodoAct.toggleAll, (state, { completed }) =>
    update(state, "todos").map((todo) =>
      update(todo).set("completed", completed)
    )
  ),

  when(TodoAct.clearCompleted, (state) =>
    update(state, "todos").remove((todo) => todo.completed)
  ),
]);

const store = createStore(todoReducer, { todos: load() }),
  dispatch = store.dispatch;

const Header = stateful("Header", (c) => {
  const [state, setState] = withState(c, { title: "" }),
    onInput = (ev: any) => setState({ title: ev.target.value }),
    onKeyDown = (ev: any) => {
      if (ev.keyCode === ENTER_KEY) {
        const newTitle = ev.target.value.trim();
        setState("title", "");

        if (newTitle) {
          ev.preventDefault();
          dispatch(TodoAct.create(newTitle));
        }
      }
    };

  return () => (
    <header className="header">
      <h1>todos</h1>
      <input
        className="new-todo"
        placeholder="What needs to be done?"
        autoFocus
        onChange={onInput}
        onKeyDown={onKeyDown}
        value={state.title}
      />
    </header>
  );
});

// --- TodoItem ------------------------------------------------------

type TodoItemProps = {
  todo: Todo;
};

const TodoItem = stateful<TodoItemProps>("TodoItem", (c) => {
  const props = withProps(c),
    inputFieldRef: RefObject<HTMLInputElement> = createRef(),
    [state, setState] = withState(c, {
      active: false,
      title: props.todo.title,
    }),
    onDestroyClick = () => dispatch(TodoAct.destroy(props.todo.id)),
    onToggleClick = (ev: any) =>
      dispatch(TodoAct.toggle(props.todo.id, ev.target.checked)),
    onDoubleClick = () => setState("active", true),
    onInput = (ev: any) => setState({ title: ev.target.value }),
    onBlur = (ev: any) => {
      const title = ev.target.value.trim();

      setState({ active: false, title });

      if (title) {
        dispatch(TodoAct.edit(props.todo.id, title));
      } else {
        dispatch(TodoAct.destroy(props.todo.id));
      }
    },
    onKeyDown = (ev: any) => {
      if (ev.keyCode === ENTER_KEY) {
        ev.target.blur();
      } else if (ev.keyCode === ESC_KEY) {
        setState("active", false);
      }
    };

  withEffect(c, () => {
    inputFieldRef.current && inputFieldRef.current.focus();
  });

  return ({ todo }) => {
    const classes = classNames({
      editing: state.active,
      completed: props.todo.completed,
    });

    return (
      <li className={classes}>
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={todo.completed}
            onChange={onToggleClick}
          />
          <label onDblClick={onDoubleClick}>{state.title}</label>
          <button className="destroy" onClick={onDestroyClick} />
        </div>
        <input
          ref={inputFieldRef}
          className="edit"
          value={state.title}
          onChange={onInput}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </li>
    );
  };
});

// --- Main ----------------------------------------------------------

type MainProps = {
  todos: Todo[];
  filter: TodoFilter;
};

const Main = stateful<MainProps>("Main", (c) => {
  const props = withProps(c),
    onChange = () =>
      dispatch(TodoAct.toggleAll(!props.todos.every((todo) => todo.completed)));

  return () => {
    const completed = !props.todos.every((todo) => todo.completed),
      filteredTodos =
        props.filter === TodoFilter.Active
          ? props.todos.filter((todo) => !todo.completed)
          : props.filter === TodoFilter.Completed
          ? props.todos.filter((todo) => todo.completed)
          : props.todos;

    return (
      <section className="main">
        <input
          id="toggle-all"
          className="toggle-all"
          type="checkbox"
          checked={completed}
          onChange={onChange}
        />
        <label htmlFor="toggle-all">Mark all as complete</label>
        <ul className="todo-list">
          {filteredTodos.map((todo) => (
            <TodoItem todo={todo} key={todo.id} />
          ))}
        </ul>
      </section>
    );
  };
});

// --- Filters -------------------------------------------------------

type FilterProps = {
  filter: TodoFilter;
};

const Filters = stateless<FilterProps>("Filters", ({ filter }) => {
  return (
    <ul className="filters">
      <li>
        <Link
          href="#/"
          className={filter === TodoFilter.None ? "selected" : ""}
        >
          All
        </Link>
      </li>
      <li>
        <Link
          href="#/active"
          className={filter === TodoFilter.Active ? "selected" : ""}
        >
          Active
        </Link>
      </li>
      <li>
        <Link
          href="#/completed"
          className={filter === TodoFilter.Completed ? "selected" : ""}
        >
          Completed
        </Link>
      </li>
    </ul>
  );
});

// --- Footer --------------------------------------------------------

type FooterProps = {
  todos: Todo[];
  filter: TodoFilter;
};

const Footer = stateful<FooterProps>("Footer", (c) => {
  const props = withProps(c),
    onClearCompletedClick = () => dispatch(TodoAct.clearCompleted());

  return () => {
    const completed = props.todos.filter((todo) => todo.completed).length,
      remaining = props.todos.length - completed;

    return (
      <footer className="footer">
        <span className="todo-count">
          <strong>{remaining}</strong> {remaining === 1 ? "item" : "items"} left
        </span>
        <Filters filter={props.filter} />
        {!!completed && (
          <button className="clear-completed" onClick={onClearCompletedClick}>
            Clear completed
          </button>
        )}
      </footer>
    );
  };
});

function save(todos: Todo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {}
}

function load() {
  try {
    try {
      const storedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) as any);

      if (Array.isArray(storedTodos) && storedTodos.length > 0) {
        return storedTodos;
      }
    } catch (e) {}
    localStorage.removeItem(STORAGE_KEY);
  } catch {}

  return [];
}

const App = stateful("App", (c) => {
  const history = createHashHistory(),
    getFilteredContent = (filter: TodoFilter) => {
      const todos = store.getState().todos;

      return (
        <div>
          <Header />
          {!!todos.length && <Main todos={todos} filter={filter} />}
          {!!todos.length && <Footer todos={todos} filter={filter} />}
        </div>
      );
    };

  withEffect(
    c,
    () =>
      store.subscribe(() => {
        save(store.getState().todos);
        refresh(c);
      }),
    null
  );

  return () => (
    <Router history={history}>
      <div path="/active">{getFilteredContent(TodoFilter.Active)}</div>
      <div path="/completed">{getFilteredContent(TodoFilter.Completed)}</div>
      <div path="/">{getFilteredContent(TodoFilter.None)}</div>
    </Router>
  );
});

// --- main ----------------------------------------------------------

render(<App />, document.getElementsByClassName("todoapp")[0]);
