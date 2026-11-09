export const CATEGORIES = ['공부', '운동', '집안일'];
export const DATA_KEY = 'waffle-week3:data:v1';
export const DRAFT_KEY = 'waffle-week3:drafts:v1';
export const emptyState = () => ({ todos: [], archive: [], theme: 'light' });
export const emptyDraft = () => ({ title: '', category: '공부' });

const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const validTask = (task) => task && typeof task.id === 'string' && typeof task.title === 'string'
  && task.title.trim().length > 0 && task.title.length <= 200 && CATEGORIES.includes(task.category)
  && validDate(task.createdAt) && typeof task.completed === 'boolean'
  && (task.completed ? validDate(task.completedAt) : task.completedAt === null);

export function parseState(raw) {
  if (!raw) return emptyState();
  const value = JSON.parse(raw);
  if (!value || !Array.isArray(value.todos) || !Array.isArray(value.archive)
    || !['light', 'dark'].includes(value.theme) || !value.todos.every(validTask)
    || !value.archive.every((task) => validTask(task) && task.completed)) {
    throw new Error('저장된 할 일 데이터의 형식이 올바르지 않습니다.');
  }
  const ids = [...value.todos, ...value.archive].map((task) => task.id);
  if (new Set(ids).size !== ids.length) throw new Error('중복된 할 일이 있습니다.');
  return { todos: value.todos, archive: value.archive, theme: value.theme };
}

export function parseDrafts(raw) {
  if (!raw) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Object.values(value).every((draft) => draft && typeof draft.title === 'string'
      && draft.title.length <= 200 && CATEGORIES.includes(draft.category))) throw new Error('임시 저장 내용을 읽을 수 없습니다.');
  return value;
}

export function reducer(state, action) {
  switch (action.type) {
    case 'save': {
      const title = action.draft.title.trim();
      if (!title || title.length > 200 || !CATEGORIES.includes(action.draft.category)) return state;
      if (action.editId) return { ...state, todos: state.todos.map((task) => task.id === action.editId
        ? { ...task, title, category: action.draft.category } : task) };
      if (!action.id || [...state.todos, ...state.archive].some((task) => task.id === action.id) || !validDate(action.now)) return state;
      return { ...state, todos: [{ id: action.id, title, category: action.draft.category,
        createdAt: action.now, completed: false, completedAt: null }, ...state.todos] };
    }
    case 'toggle':
      if (!validDate(action.now)) return state;
      return { ...state, todos: state.todos.map((task) => task.id === action.id
        ? { ...task, completed: !task.completed, completedAt: task.completed ? null : action.now } : task) };
    case 'archive': {
      const task = state.todos.find((item) => item.id === action.id && item.completed);
      if (!task) return state;
      return { ...state, todos: state.todos.filter((item) => item.id !== task.id), archive: [task, ...state.archive] };
    }
    case 'theme': return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    default: return state;
  }
}

// Local calendar date, rather than UTC, so Korean dates match the date picker.
export function dateKey(iso) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function selectArchive(archive, date, order = 'desc') {
  return archive.filter((task) => !date || dateKey(task.completedAt) === date)
    .sort((a, b) => (Date.parse(a.completedAt) - Date.parse(b.completedAt)) * (order === 'asc' ? 1 : -1));
}
