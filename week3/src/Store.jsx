import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DATA_KEY, DRAFT_KEY, emptyState, parseState, parseDrafts, reducer } from './model';

const Store = createContext(null);
function read(storageName, key, parse, fallback) {
  try { return { value: parse(window[storageName].getItem(key)), error: '' }; }
  catch { return { value: fallback(), error: '저장된 데이터를 읽지 못했습니다. 브라우저 저장소 설정을 확인해 주세요. 기존 데이터는 덮어쓰지 않습니다.' }; }
}

export function StoreProvider({ children }) {
  const [initial] = useState(() => read('localStorage', DATA_KEY, parseState, emptyState));
  const [initialDrafts] = useState(() => read('sessionStorage', DRAFT_KEY, parseDrafts, () => ({})));
  const [state, setState] = useState(initial.value);
  const [drafts, setDrafts] = useState(initialDrafts.value);
  const [error, setError] = useState(initial.error || initialDrafts.error);
  const current = useRef(state);
  const currentDrafts = useRef(drafts);
  const blocked = useRef(Boolean(initial.error));
  const draftsBlocked = useRef(Boolean(initialDrafts.error));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.documentElement.style.colorScheme = state.theme;
  }, [state.theme]);

  function dispatch(action) {
    if (blocked.current) return false;
    const next = reducer(current.current, action);
    try {
      // Persist the full snapshot first: archiving cannot leave duplicate or missing tasks.
      localStorage.setItem(DATA_KEY, JSON.stringify(next));
      current.current = next;
      setState(next);
      setError('');
      return true;
    } catch { setError('저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인한 뒤 다시 시도해 주세요.'); return false; }
  }

  function updateDraft(key, draft) {
    if (draftsBlocked.current) return false;
    const next = { ...currentDrafts.current };
    if (draft === null) delete next[key]; else next[key] = draft;
    currentDrafts.current = next;
    setDrafts(next);
    try {
      if (Object.keys(next).length) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(DRAFT_KEY);
      return true;
    } catch { setError('작성 중인 내용을 임시 저장하지 못했습니다. 이 탭을 새로고침하면 입력값이 사라질 수 있습니다.'); return false; }
  }

  function reset() {
    try {
      // Only remove this application's keys; preserve other applications' data.
      sessionStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DATA_KEY);
      current.current = emptyState(); currentDrafts.current = {};
      setState(current.current); setDrafts({}); setError('');
      blocked.current = false; draftsBlocked.current = false;
      return true;
    } catch { setError('데이터를 모두 초기화하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.'); return false; }
  }

  return <Store.Provider value={{ state, drafts, error, dispatch, updateDraft, reset }}>{children}</Store.Provider>;
}

export function useStore() {
  const store = useContext(Store);
  if (!store) throw new Error('StoreProvider가 필요합니다.');
  return store;
}
