import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, reducer, parseState, parseDrafts, selectArchive } from '../src/model.js';

const start = '2026-11-09T01:00:00.000Z';
const finish = '2026-11-10T02:00:00.000Z';
const add = (state, id = '1') => reducer(state, { type: 'save', id, now: start, draft: { title: '  리액트 공부  ', category: '공부' } });

test('추가한 할 일은 저장/복구 후 제목·카테고리·생성일·완료 상태가 유지된다', () => {
  const state = parseState(JSON.stringify(add(emptyState())));
  assert.deepEqual(state.todos[0], { id: '1', title: '리액트 공부', category: '공부', createdAt: start, completed: false, completedAt: null });
});
test('체크 해제 시 완료일 삭제, 다시 완료한 시각으로 보관', () => {
  let state = add(emptyState());
  assert.equal(reducer(state, { type: 'archive', id: '1' }), state);
  state = reducer(state, { type: 'toggle', id: '1', now: start });
  state = reducer(state, { type: 'toggle', id: '1', now: start });
  assert.equal(state.todos[0].completedAt, null);
  state = reducer(state, { type: 'toggle', id: '1', now: finish });
  state = reducer(state, { type: 'archive', id: '1' });
  assert.equal(state.todos.length, 0);
  assert.equal(state.archive[0].createdAt, start);
  assert.equal(state.archive[0].completedAt, finish);
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  assert.equal(reducer(state, { type: 'archive', id: '1' }), state);
});
test('수정은 기존 식별자·생성일·완료 여부를 유지한다', () => {
  let state = reducer(add(emptyState()), { type: 'toggle', id: '1', now: finish });
  state = reducer(state, { type: 'save', editId: '1', draft: { title: '달리기', category: '운동' } });
  assert.deepEqual(state.todos[0], { id: '1', title: '달리기', category: '운동', createdAt: start, completed: true, completedAt: finish });
});
test('빈 제목, 잘못된 분류, 중복 ID는 추가하지 않는다', () => {
  const state = add(emptyState());
  assert.equal(add(state), state);
  for (const draft of [{ title: ' ', category: '공부' }, { title: 'test', category: '기타' }]) {
    assert.equal(reducer(state, { type: 'save', id: '2', now: start, draft }), state);
  }
});
test('손상된 저장값을 거부하고 정상 임시 입력값은 복원한다', () => {
  for (const raw of ['broken', '{}', 'null', JSON.stringify({ ...emptyState(), todos: [{}] })]) assert.throws(() => parseState(raw));
  assert.deepEqual(parseDrafts('{"new":{"title":"작성 중","category":"운동"}}').new, { title: '작성 중', category: '운동' });
  assert.throws(() => parseDrafts('{"new":null}'));
});
test('천 개의 할 일 저장과 보관함 정렬은 원본을 손상하지 않는다', () => {
  let state = emptyState();
  for (let i = 0; i < 1000; i++) state = add(state, String(i));
  assert.equal(parseState(JSON.stringify(state)).todos.length, 1000);
  for (const [id, now] of [['1', finish], ['2', start]]) {
    state = reducer(state, { type: 'toggle', id, now });
    state = reducer(state, { type: 'archive', id });
  }
  const before = JSON.stringify(state.archive);
  assert.equal(selectArchive(state.archive, '', 'desc')[0].id, '1');
  assert.equal(selectArchive(state.archive, '', 'asc')[0].id, '2');
  assert.equal(selectArchive(state.archive, '2026-11-10').length, 1);
  assert.equal(JSON.stringify(state.archive), before);
});
