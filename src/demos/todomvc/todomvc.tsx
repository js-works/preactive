/** @jsx h */
import { autorun, makeAutoObservable } from 'mobx';
import { h, render } from 'preactive';
import { makeComponentsMobxAware } from 'preactive/mobx-tools';

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

// === enums =========================================================

enum TodoFilter {
  None,
  Active,
  Completed
}

// === mobx store ====================================================

const store = makeAutoObservable({
  todos: [] as Todo[],

  setTodos(todos: Todo[]) {
    this.todos = todos;
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

function App() {
  return <div>Juhu</div>;
}

// === main ==========================================================

alert(1);
makeComponentsMobxAware();
store.setTodos(loadTodos());
autorun(() => saveTodos(store.todos));
render(<App />, '.todoapp');
