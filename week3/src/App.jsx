import { useEffect, useRef, useState } from 'react';
import { useStore } from './Store';
import { CATEGORIES, emptyDraft, selectArchive } from './model';

const dateLabel = (value) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
const badge = 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400';

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    back: <path d="m12 5-7 7 7 7M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    archive: <><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6" /></>,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}
    className="panel fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md p-6 text-neutral-900 shadow-2xl dark:text-neutral-100 sm:p-8">
    <div className="mb-6 flex items-center justify-between gap-4"><h2 id="dialog-title" className="text-xl font-bold">{title}</h2><button type="button" aria-label="닫기" onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"><Icon name="close" /></button></div>
    {children}
  </dialog>;
}

function TaskEditor({ task, onClose }) {
  const { drafts, dispatch, updateDraft, error } = useStore();
  const key = task ? `edit:${task.id}` : 'new';
  const [draft, setDraft] = useState(() => drafts[key] ?? (task ? { title: task.title, category: task.category } : emptyDraft()));
  function change(next) { setDraft(next); updateDraft(key, next); }
  function save(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (dispatch({ type: 'save', editId: task?.id, draft, id: crypto.randomUUID(), now: new Date().toISOString() })) {
      updateDraft(key, null); onClose();
    }
  }
  return <Modal title={task ? '할 일 수정' : '새 할 일 추가'} onClose={onClose}>
    <form onSubmit={save}>
      <label htmlFor="task-title" className="mb-2 block text-sm font-medium">할 일 제목</label>
      <input autoFocus id="task-title" className="field" value={draft.title} onChange={(event) => change({ ...draft, title: event.target.value })} placeholder="예: 리액트 useContext 과제 시작하기" maxLength={200} required />
      <div className="muted mt-1 text-right text-xs">{draft.title.length}/200</div>
      <fieldset className="mt-5"><legend className="mb-3 text-sm font-medium">카테고리</legend><div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => <label key={category} className="cursor-pointer"><input type="radio" name="category" className="peer sr-only" value={category} checked={draft.category === category} onChange={() => change({ ...draft, category })} /><span className="block rounded-full border border-neutral-200 px-4 py-2 text-sm peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 dark:border-neutral-700 dark:peer-checked:border-white dark:peer-checked:bg-white dark:peer-checked:text-neutral-900">{category}</span></label>)}
      </div></fieldset>
      <p className="mt-6 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">닫기 또는 Esc로 나가면 작성 중인 내용이 이 탭에 남아요. 취소를 누르면 지워집니다.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3"><button className="secondary" type="button" onClick={() => { updateDraft(key, null); onClose(); }}>취소</button><button className="primary" disabled={!draft.title.trim()} type="submit">저장하기</button></div>
    </form>
  </Modal>;
}

function Empty({ archive = false }) {
  return <div className="panel flex flex-col items-center px-6 py-20 text-center">
    <div className="mb-5 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800"><Icon name={archive ? 'archive' : 'check'} className="h-7 w-7" /></div>
    <h2 className="font-semibold">{archive ? '아직 보관한 할 일이 없어요' : '가볍게, 하나부터 시작해요'}</h2>
    <p className="muted mt-2 text-sm">{archive ? '완료한 할 일을 보관하면 여기에 차곡차곡 쌓여요.' : '오른쪽 아래 + 버튼으로 할 일을 추가해 보세요.'}</p>
  </div>;
}

function TodoList({ onEdit }) {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('전체');
  const filtered = state.todos.filter((task) => filter === '전체' || task.category === filter);
  const completed = state.todos.filter((task) => task.completed).length;
  return <>
    <div className="mb-8 flex items-end justify-between gap-3"><div><p className="muted mb-2 text-xs font-semibold uppercase tracking-[0.16em]">One thing at a time</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">천 개의 할 일</h1><p className="muted mt-3 text-sm">오늘 해야 할 일을 기록하고 관리해보세요.</p></div><span className="muted shrink-0 text-sm">완료 {completed} / {state.todos.length}</span></div>
    <div className="mb-6 flex flex-wrap gap-2" aria-label="카테고리 필터">{['전체', ...CATEGORIES].map((category) => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === category ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-white text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800'}`}>{category}</button>)}</div>
    {filtered.length ? <ul className="space-y-3">{filtered.map((task) => <li key={task.id} className="panel flex items-center gap-3 p-4 sm:gap-4 sm:px-5">
      <input type="checkbox" aria-label={`${task.title} 완료`} checked={task.completed} onChange={() => dispatch({ type: 'toggle', id: task.id, now: new Date().toISOString() })} className="h-5 w-5 shrink-0 cursor-pointer accent-neutral-900 dark:accent-white" />
      <button onClick={() => onEdit(task)} className={`min-w-0 flex-1 break-words text-left text-sm leading-6 ${task.completed ? 'muted line-through' : ''}`}>{task.title}</button>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">{task.completed && <button onClick={() => dispatch({ type: 'archive', id: task.id })} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">보관하기</button>}<span className={badge}>{task.category}</span></div>
    </li>)}</ul> : state.todos.length ? <div className="panel p-12 text-center"><p className="muted text-sm">{filter} 카테고리에 할 일이 없어요.</p></div> : <Empty />}
  </>;
}

function Settings({ onArchive }) {
  const { state, dispatch, reset, error } = useStore();
  const [confirm, setConfirm] = useState(false);
  return <><h1 className="mb-8 text-3xl font-bold">설정</h1><div className="max-w-2xl space-y-4">
    <section className="panel flex items-center justify-between gap-4 p-6"><div><h2 className="font-semibold">다크 모드</h2><p className="muted mt-2 text-sm">어두운 테마로 눈을 편안하게.</p></div><button aria-label="다크 모드" role="switch" aria-checked={state.theme === 'dark'} onClick={() => dispatch({ type: 'theme' })} className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${state.theme === 'dark' ? 'bg-white' : 'bg-neutral-300'}`}><span className={`h-5 w-5 rounded-full transition-transform ${state.theme === 'dark' ? 'translate-x-5 bg-neutral-900' : 'bg-white'}`} /></button></section>
    <section className="panel flex items-center justify-between gap-4 p-6"><div><h2 className="font-semibold">완료한 할 일 보관함</h2><p className="muted mt-2 text-sm">해낸 일 {state.archive.length}개가 모여 있어요.</p></div><button className="secondary shrink-0" onClick={onArchive}>보관함 열기</button></section>
    <section className="panel flex items-center justify-between gap-4 p-6"><div><h2 className="font-semibold">저장된 데이터 초기화</h2><p className="muted mt-2 text-sm">할 일, 보관함, 임시 입력값, 테마를 모두 지웁니다.</p></div><button onClick={() => setConfirm(true)} className="shrink-0 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">초기화</button></section>
  </div>{confirm && <Modal title="모든 데이터를 초기화할까요?" onClose={() => setConfirm(false)}><p className="muted text-sm leading-6">저장된 할 일과 보관함, 작성 중인 내용이 모두 삭제됩니다. 삭제한 내용은 되돌릴 수 없어요.</p>{error && <p role="alert" className="mt-3 text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button className="secondary" onClick={() => setConfirm(false)}>취소</button><button className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700" onClick={() => { if (reset()) setConfirm(false); }}>모두 삭제</button></div></Modal>}</>;
}

function Archive() {
  const { state } = useStore();
  const [date, setDate] = useState('');
  const [order, setOrder] = useState('desc');
  const tasks = selectArchive(state.archive, date, order);
  return <><h1 className="text-3xl font-bold">완료한 할 일 보관함</h1><p className="muted mt-3 text-sm">하나씩 해낸 일, 모두 {state.archive.length}개</p>
    <div className="mb-6 mt-8 flex flex-wrap items-end gap-3"><label className="text-xs font-medium">완료일<input type="date" className="field mt-2" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="text-xs font-medium">정렬<select className="field mt-2" value={order} onChange={(event) => setOrder(event.target.value)}><option value="desc">최근 완료순</option><option value="asc">오래된 완료순</option></select></label>{date && <button className="secondary" onClick={() => setDate('')}>날짜 해제</button>}</div>
    {!state.archive.length ? <Empty archive /> : !tasks.length ? <div className="panel p-12 text-center"><p className="muted">선택한 날짜에 완료한 할 일이 없어요.</p></div> : <ul className="space-y-3">{tasks.map((task) => <li className="panel p-5" key={task.id}><div className="flex items-start gap-3"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" /><h2 className="min-w-0 flex-1 break-words text-sm font-medium">{task.title}</h2><span className={badge}>{task.category}</span></div><div className="muted mt-3 flex flex-wrap gap-x-6 gap-y-1 pl-8 text-xs"><span>생성일 <time dateTime={task.createdAt}>{dateLabel(task.createdAt)}</time></span><span>완료일 <time dateTime={task.completedAt}>{dateLabel(task.completedAt)}</time></span></div></li>)}</ul>}
  </>;
}

export default function App() {
  const { error } = useStore();
  const [page, setPage] = useState('todos');
  const [editor, setEditor] = useState(null);
  return <div className="min-h-dvh">
    <header className="bg-neutral-950 text-white dark:border-b dark:border-neutral-800"><nav aria-label="주 메뉴" className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8"><button onClick={() => setPage('todos')} className="flex items-center gap-3 text-sm font-semibold">{page !== 'todos' && <Icon name="back" className="h-4 w-4" />}오늘 뭐하지<span className="hidden text-neutral-500 sm:inline">/</span><span className="hidden text-xs font-normal text-neutral-400 sm:inline">작은 실천의 기록</span></button><div className="flex gap-5"><button onClick={() => setPage('archive')} aria-current={page === 'archive' ? 'page' : undefined} className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white"><Icon name="archive" className="h-4 w-4" />보관함</button><button onClick={() => setPage('settings')} aria-current={page === 'settings' ? 'page' : undefined} className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white"><Icon name="settings" className="h-4 w-4" />설정</button></div></nav></header>
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-10 sm:px-8 sm:pt-14">{error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}{page === 'todos' ? <TodoList onEdit={(task) => setEditor({ task })} /> : page === 'settings' ? <Settings onArchive={() => setPage('archive')} /> : <Archive />}</main>
    {page === 'todos' && <button onClick={() => setEditor({ task: null })} aria-label="할 일 추가" className="fixed bottom-7 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-neutral-900 sm:bottom-10 sm:right-10"><Icon name="plus" className="h-6 w-6" /></button>}
    {editor && <TaskEditor task={editor.task} onClose={() => setEditor(null)} />}
  </div>;
}
