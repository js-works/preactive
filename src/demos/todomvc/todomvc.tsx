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

type TodoFilter = (todo: Todo) => boolean;

// === constants =====================================================

const ENTER_KEY = 13;
const ESC_KEY = 27;
const STORAGE_KEY = 'todomvc::data';

// === todo filters ==================================================

const filters = {
  none: (todo: Todo) => true,
  active: (todo: Todo) => !todo.completed,
  completed: (todo: Todo) => todo.completed
};

// === mobx store ====================================================

const store = makeAutoObservable({
  filter: filters.none,
  todos: [] as Todo[],

  init(todos: Todo[] = [], filter = filters.none) {
    this.todos = todos;
    this.filter = filter;
  },

  setFilter(filter: TodoFilter) {
    this.filter = filter;
  },

  setTitle(id: number, title: string) {
    const idx = store.todos.findIndex((it) => (it.id = id));

    if (idx >= 0) {
      store.todos[idx].title = title;
    }
  },

  addTodo(title: string) {
    const id = store.todos.reduce((max, it) => Math.max(max, it.id + 1), 0);

    store.todos.push({
      id,
      title,
      completed: false
    });
  },

  deleteTodo(id: number) {
    const idx = store.todos.findIndex((it) => (it.id = id));

    if (idx >= 0) {
      store.todos.splice(idx, 1);
    }
  },

  deleteCompleted() {
    store.todos = store.todos.filter((todo) => !todo.completed);
  },

  setCompleted(id: number, completed = true) {
    const idx = store.todos.findIndex((it) => (it.id = id));

    if (idx >= 0) {
      store.todos[idx].completed = completed;
    }
  },

  setAllCompleted(completed = true) {
    store.todos.forEach((todo) => {
      todo.completed = completed;
    });
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

function TodoItem(p: { todo: Todo }) {
  const inputFieldRef = createRef<HTMLInputElement>();

  const [state, set] = stateObj({
    active: false,
    title: p.todo.title
  });

  const onDestroyClick = () => store.deleteTodo(p.todo.id);

  const onToggleClick = (ev: any) =>
    store.setCompleted(p.todo.id, ev.target.checked);

  const onDoubleClick = () => set.active(true);
  const onInput = (ev: any) => set.title(ev.target.value);

  const onBlur = (ev: any) => {
    const title = ev.target.value.trim();
    set({ active: false, title });

    if (title) {
      store.setTitle(p.todo.id, title);
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
}

function Main(p: { todos: Todo[]; filter: TodoFilter }) {
  const onChange = () =>
    store.setAllCompleted(!p.todos.every((todo) => todo.completed));

  return () => {
    const completed = !p.todos.every((todo) => todo.completed);
    const filteredTodos = p.todos.filter(store.filter);

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

function Filters(p: {
  filter: TodoFilter; //
}) {
  const createListener = (filter: TodoFilter) => {
    return () => store.setFilter(filter);
  };

  return (
    <ul className="filters">
      <li>
        <button
          onClick={createListener(filters.none)}
          className={p.filter === filters.none ? 'selected' : ''}
        >
          All
        </button>
      </li>
      <li>
        <button
          onClick={createListener(filters.active)}
          className={p.filter === filters.active ? 'selected' : ''}
        >
          Active
        </button>
      </li>
      <li>
        <button
          onClick={createListener(filters.completed)}
          className={p.filter === filters.completed ? 'selected' : ''}
        >
          Completed
        </button>
      </li>
    </ul>
  );
}

function Footer(p: {
  todos: Todo[]; //
  filter: TodoFilter;
}) {
  const onClearCompletedClick = () => store.deleteCompleted();

  return () => {
    const completed = p.todos.filter((todo) => todo.completed).length;
    const remaining = p.todos.length - completed;

    return (
      <footer className="footer">
        <span className="todo-count">
          <strong>{remaining}</strong> {remaining === 1 ? 'item' : 'items'} left
        </span>
        <Filters filter={p.filter} />
        {!!completed && (
          <button className="clear-completed" onClick={onClearCompletedClick}>
            Clear completed
          </button>
        )}
      </footer>
    );
  };
}

function App() {
  const getContent = (filter: TodoFilter) => {
    const todos = store.todos.filter(store.filter);
    console.log(store.filter);
    return (
      <div>
        yyyy
        <Header />
        {!!todos.length && <Main todos={todos} filter={filter} />}
        {!!todos.length && <Footer todos={todos} filter={filter} />}
      </div>
    );
  };

  return () => (
    <div>
      {store.filter === filters.active && getContent(filters.active)}
      {store.filter === filters.completed && getContent(filters.completed)}
      {store.filter === filters.none && getContent(filters.none)}
    </div>
  );
}

// === main ==========================================================

makeComponentsMobxAware();
store.init(loadTodos());
autorun(() => saveTodos(store.todos));
render(<App />, '.todoapp');
