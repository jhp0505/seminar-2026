import { test, expect } from '@playwright/test';

test('추가, 수정, 필터, 완료, 보관, 새로고침, 다크 모드, 초기화', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await page.getByLabel('할 일 제목').fill('리액트 공부');
  await page.getByRole('button', { name: '저장하기' }).click();
  await page.reload();
  await page.getByRole('button', { name: '리액트 공부', exact: true }).click();
  await page.getByLabel('할 일 제목').fill('30분 달리기');
  await page.getByRole('dialog').getByText('운동', { exact: true }).click();
  await page.getByRole('button', { name: '저장하기' }).click();
  await page.getByRole('button', { name: '공부', exact: true }).click();
  await expect(page.getByRole('button', { name: '30분 달리기', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '운동', exact: true }).click();
  await page.getByRole('checkbox', { name: '30분 달리기 완료' }).check();
  await expect(page.getByRole('button', { name: '30분 달리기', exact: true })).toHaveClass(/line-through/);
  await page.getByRole('button', { name: '보관하기', exact: true }).click();
  await page.getByRole('button', { name: '보관함', exact: true }).click();
  await expect(page.getByRole('heading', { name: '30분 달리기' })).toBeVisible();
  await expect(page.getByText('생성일')).toBeVisible();
  await expect(page.getByText('완료일', { exact: false }).last()).toBeVisible();
  await page.getByLabel('완료일', { exact: true }).fill('2000-01-01');
  await expect(page.getByText('선택한 날짜에 완료한 할 일이 없어요.')).toBeVisible();
  await page.getByRole('button', { name: '날짜 해제' }).click();
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('switch', { name: '다크 모드' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await page.getByLabel('할 일 제목').fill('초기화할 입력값');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await page.getByRole('button', { name: '모두 삭제' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('waffle-week3:data:v1'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('waffle-week3:drafts:v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  await page.getByRole('button', { name: '보관함 열기' }).click();
  await expect(page.getByText('아직 보관한 할 일이 없어요')).toBeVisible();
});

test('닫기·Esc·새로고침은 초안을 유지하고 취소·저장은 지운다', async ({ page }) => {
  await page.goto('/');
  const open = () => page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await open();
  await page.getByLabel('할 일 제목').fill('임시 메모');
  await page.getByRole('dialog').getByText('집안일', { exact: true }).click();
  await page.keyboard.press('Escape');
  await open();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('임시 메모');
  await expect(page.getByRole('radio', { name: '집안일' })).toBeChecked();
  await page.reload();
  await open();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('임시 메모');
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await open();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('');
  await expect(page.getByRole('button', { name: '저장하기' })).toBeDisabled();
  await page.getByLabel('할 일 제목').fill('저장할 메모');
  await page.getByRole('button', { name: '저장하기' }).click();
  await open();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('');
});

test('모바일에서 가로 넘침 없이 사용하고 수정 초안과 신규 초안을 분리한다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await page.getByLabel('할 일 제목').fill('기존 할 일');
  await page.getByRole('button', { name: '저장하기' }).click();
  await page.getByRole('button', { name: '기존 할 일', exact: true }).click();
  await page.getByLabel('할 일 제목').fill('수정 중');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '기존 할 일', exact: true }).click();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('수정 중');
  await page.getByRole('button', { name: '취소', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('저장 공간 오류가 나면 거짓 성공 없이 모달 입력을 보존한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await page.getByLabel('할 일 제목').fill('안전하게 저장');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'waffle-week3:data:v1') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('할 일 제목')).toHaveValue('안전하게 저장');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('저장하지 못했습니다');
});

test('라이트·다크·모바일 화면 검토용 캡처', async ({ page }) => {
  await page.goto('/');
  for (const title of ['리액트 useContext 과제 시작하기', '아침 30분 산책', '설거지하기']) {
    await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
    await page.getByLabel('할 일 제목').fill(title);
    await page.getByRole('button', { name: '저장하기' }).click();
  }
  await page.getByRole('checkbox', { name: '아침 30분 산책 완료' }).check();
  await page.screenshot({ path: 'test-results/light.png', fullPage: true });
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('switch', { name: '다크 모드' }).click();
  await page.getByRole('button', { name: /오늘 뭐하지/ }).click();
  await page.screenshot({ path: 'test-results/dark.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: '할 일 추가', exact: true }).click();
  await page.screenshot({ path: 'test-results/mobile-modal.png', fullPage: true });
});
