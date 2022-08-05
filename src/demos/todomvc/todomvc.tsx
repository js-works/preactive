/** @jsx h */
import { createRef } from 'preact';
import { h, render } from 'preactive';
import { effect, stateObj } from 'preactive/ext';
import { makeComponentsMobxAware } from 'preactive/mobx-tools';
import { autorun, makeAutoObservable } from 'mobx';

// === types =========================================================

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

// === constants =====================================================

const ENTER_KEY = 13;
const ESC_KEY = 27;
const STORAGE_KEY = 'todomvc::data';

// === Filter ========================================================

class Filter {
  static none = new Filter(() => true);
  static active = new Filter((todo) => !todo.completed);
  static completed = new Filter((todo) => todo.completed);

  private constructor(public apply: (todo: Todo) => boolean) {}
}

// === mobx store ====================================================

const store = makeAutoObservable({
  filter: Filter.none,
  todos: [] as Todo[],

  init(todos: Todo[] = [], filter = Filter.none) {
    this.todos = todos;
    this.filter = filter;
  },

  setFilter(filter: Filter) {
    this.filter = filter;
  },

  setTodoTitle(id: number, title: string) {
    const idx = this.todos.findIndex((todo) => (todo.id = id));

    if (idx >= 0) {
      this.todos[idx].title = title;
    }
  },

  addTodo(title: string) {
    const id = store.todos.reduce((max, todo) => Math.max(max, todo.id + 1), 0);

    this.todos.push({
      id,
      title,
      completed: false
    });
  },

  deleteTodo(id: number) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  },

  deleteCompleted() {
    this.todos = this.todos.filter((todo) => !todo.completed);
  },

  setCompleted(id: number, completed = true) {
    const idx = this.todos.findIndex((todo) => todo.id === id);

    if (idx >= 0) {
      this.todos[idx].completed = completed;
    }
  },

  setAllCompleted(completed = true) {
    this.todos.forEach((todo) => (todo.completed = completed));
  }
});

// === storage functions =============================================

function loadTodos(): Todo[] {
  try {
    try {
      const storedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) as any);

      if (Array.isArray(storedTodos) && storedTodos.length > 0) {
        return storedTodos;
      }
    } catch {}

    localStorage.removeItem(STORAGE_KEY);
  } catch {}

  return [];
}

function saveTodos(todos: Todo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {}
}

// === components ====================================================

function Header() {
  const [s, set] = stateObj({ title: '' });
  const onInput = (ev: any) => set.title(ev.target.value);

  const onKeyDown = (ev: any) => {
    if (ev.keyCode === ENTER_KEY) {
      const newTitle = ev.target.value.trim();
      set.title('');

      if (newTitle) {
        ev.preventDefault();
        store.addTodo(newTitle);
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
        value={s.title}
      />
    </header>
  );
}

function TodoItem(p: {
  todo: Todo; //
}) {
  const inputFieldRef = createRef<HTMLInputElement>();

  const [state, set] = stateObj({
    active: false,
    title: p.todo.title
  });

  const onDeleteClick = () => store.deleteTodo(p.todo.id);

  const onToggleClick = (ev: any) =>
    store.setCompleted(p.todo.id, ev.target.checked);

  const onDoubleClick = () => set.active(true);
  const onInput = (ev: any) => set.title(ev.target.value);

  const onBlur = (ev: any) => {
    const title = ev.target.value.trim();
    set({ active: false, title });

    if (title) {
      store.setTodoTitle(p.todo.id, title);
    } else {
      store.deleteTodo(p.todo.id);
    }
  };

  const onKeyDown = (ev: any) => {
    if (ev.keyCode === ENTER_KEY) {
      ev.target.blur();
    } else if (ev.keyCode === ESC_KEY) {
      set.active(false);
    }
  };

  effect(() => {
    if (inputFieldRef.current) {
      inputFieldRef.current.focus();
    }
  });

  return () => {
    const classes =
      (state.active ? 'editing ' : '') + (p.todo.completed ? 'completed' : '');

    return (
      <li className={classes}>
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={p.todo.completed}
            onChange={onToggleClick}
          />
          <label onDblClick={onDoubleClick}>{state.title}</label>
          <button className="destroy" onClick={onDeleteClick} />
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
}

function Main() {
  const onChange = () =>
    store.setAllCompleted(!store.todos.every((todo) => todo.completed));

  return () => {
    const completed = !store.todos.every((todo) => todo.completed);
    const filteredTodos = store.todos.filter(store.filter.apply);

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
}

function Filters() {
  const createListener = (filter: Filter) => {
    return (ev: Event) => {
      ev.preventDefault();
      store.setFilter(filter);
    };
  };

  return (
    <ul className="filters">
      <li>
        <a
          href="#/"
          onClick={createListener(Filter.none)}
          className={store.filter === Filter.none ? 'selected' : ''}
        >
          All
        </a>
      </li>
      <li>
        <a
          href="#/active"
          onClick={createListener(Filter.active)}
          className={store.filter === Filter.active ? 'selected' : ''}
        >
          Active
        </a>
      </li>
      <li>
        <a
          href="#/completed"
          onClick={createListener(Filter.completed)}
          className={store.filter === Filter.completed ? 'selected' : ''}
        >
          Completed
        </a>
      </li>
    </ul>
  );
}

function Footer() {
  const onClearCompletedClick = () => store.deleteCompleted();

  return () => {
    const numCompleted = store.todos.filter((todo) => todo.completed).length;
    const numRemaining = store.todos.length - numCompleted;

    return (
      <footer className="footer">
        <span className="todo-count">
          <strong>{numRemaining}</strong>{' '}
          {numRemaining === 1 ? 'item' : 'items'} left
        </span>
        <Filters />
        {!!numCompleted && (
          <button className="clear-completed" onClick={onClearCompletedClick}>
            Clear completed
          </button>
        )}
      </footer>
    );
  };
}

function App() {
  const getContent = (filter: Filter) => {
    const todos = store.todos.filter(store.filter.apply);

    return (
      <div>
        <Header />
        {!!store.todos.length && <Main />}
        {!!store.todos.length && <Footer />}
      </div>
    );
  };

  return () => (
    <div>
      {store.filter === Filter.active && getContent(Filter.active)}
      {store.filter === Filter.completed && getContent(Filter.completed)}
      {store.filter === Filter.none && getContent(Filter.none)}
    </div>
  );
}

// === main ==========================================================

makeComponentsMobxAware();
store.init(loadTodos());
autorun(() => saveTodos(store.todos));
render(<App />, '.todoapp');
