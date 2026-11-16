// Acceptance steps 1-8: wall workflow
const { open } = require('./lib');
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : ''));
(async () => {
  const T = await open(); const { page, ev } = T;
  // 1. demo mode + skippable intro
  await page.click('[data-demo="admin"]'); await page.waitForTimeout(450);
  ok('1 intro is playing and skippable', await ev('AW.stage.introPlaying') && await page.locator('#intro-skip').isVisible());
  await page.click('#intro-skip'); await page.waitForTimeout(500);
  ok('1 workspace usable right after skip', !(await ev('AW.stage.introPlaying')) && !(await ev('document.querySelector("#ws-wall").classList.contains("controls-hidden")')));
  // 2. orbit / pan / zoom / select
  const box = await page.locator('#stage').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, box.y + 60); await page.mouse.down(); await page.mouse.move(cx + 60, box.y + 80, { steps: 5 }); await page.mouse.up();
  await page.mouse.move(cx, box.y + 60); await page.mouse.down({ button: 'right' }); await page.mouse.move(cx + 20, box.y + 70, { steps: 4 }); await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -200); await page.waitForTimeout(900);
  await page.click('[data-dock="fit"]'); await page.waitForTimeout(1200);
  await page.mouse.click(cx, cy - 30); await page.waitForTimeout(500);
  ok('2 click selects a monitor', (await ev('AW.wall.S.sel && AW.wall.S.sel.kind')) === 'monitor', await ev('AW.wall.S.sel'));
  ok('2 anchored callout visible', await page.locator('#callout').isVisible(), await page.locator('#callout').textContent());
  await page.click('[data-act="deselect"]');
  // 3. 4x3 -> 5x3
  await page.click('[data-step="cols"][data-d="1"]'); await page.waitForTimeout(200);
  ok('3 total shows true target immediately', (await page.textContent('.grid-total')).includes('15 monitors'), await page.textContent('.grid-total'));
  ok('3 grid motion graphics on', await ev('document.querySelector(".fx-grid").classList.contains("on")'));
  await page.waitForTimeout(1800);
  ok('3 stage has 15 monitors', (await ev('AW.stage.cols * AW.stage.rows')) === 15);
  // rapid repeated input: latest wins
  for (let i = 0; i < 3; i++) await page.click('[data-step="cols"][data-d="1"]');
  for (let i = 0; i < 3; i++) await page.click('[data-step="cols"][data-d="-1"]');
  await page.waitForTimeout(1500);
  ok('12 rapid grid changes settle on latest', (await ev('AW.wall.S.draft.cols')) === 5 && (await ev('AW.stage.cols')) === 5);
  // 4. edit, add, resize across monitors
  await T.mode('edit');
  ok('4 edit view is front-aligned', await ev('AW.stage.aligned()'));
  await page.fill('#src-search', 'Camera 002');
  ok('search filters sources', (await page.locator('.src').count()) === 1);
  await page.hover('.src'); await page.click('.src [data-add]'); await page.waitForTimeout(400);
  await ev('AW.wall.setRect(AW.wall.selectedItem().id, {x:0,y:0,w:1920,h:1080})'); await page.waitForTimeout(300);
  const before = await ev('(i => [i.x,i.y,i.w,i.h])(AW.wall.selectedItem())');
  const h = await page.locator('.handles [data-h="se"]').boundingBox();
  const sc = await ev('AW.stage.scale()');
  await page.mouse.move(h.x + 5, h.y + 5); await page.mouse.down(); await page.mouse.move(h.x + 5 + 1920 * sc * 1.02, h.y + 5 + 1080 * sc * 1.02, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(300);
  const after = await ev('(i => [i.x,i.y,i.w,i.h])(AW.wall.selectedItem())');
  ok('4 resize spans several monitors (snapped)', after[2] === 3840 && after[3] === 2160, { before, after });
  // numeric fields
  await page.fill('[data-prop="x"]', '1920'); await page.press('[data-prop="x"]', 'Enter'); await page.waitForTimeout(150);
  ok('numeric X edits position', (await ev('AW.wall.selectedItem().x')) === 1920);
  await page.fill('[data-prop="w"]', '10'); await page.press('[data-prop="w"]', 'Enter'); await page.waitForTimeout(150);
  ok('invalid width rejected with message', (await ev('AW.wall.selectedItem().w')) === 3840 && await page.locator('[data-err]').isVisible(), await page.locator('[data-err]').textContent());
  // 5. back to explore
  await T.mode('explore'); await T.shot('a-5-continuity');
  ok('5 selection and content preserved', (await ev('AW.wall.selectedItem().w')) === 3840);
  // 6. shrink, recover, undo/redo
  await page.click('[data-act="deselect"]');
  await page.click('[data-step="cols"][data-d="-1"]'); await page.click('[data-step="cols"][data-d="-1"]'); await page.waitForTimeout(600);
  const out = await ev('AW.wall.outOfBounds().length');
  ok('6 shrink keeps content and flags it', out > 0 && await page.locator('#stage-banner').isVisible(), { out, items: await ev('AW.wall.S.draft.items.length') });
  await T.shot('a-6-banner');
  await page.click('[data-b="reposition"]'); await page.waitForTimeout(300);
  ok('6 Reposition brings all inside', (await ev('AW.wall.outOfBounds().length')) === 0);
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
  ok('6 Undo restores stray content', (await ev('AW.wall.outOfBounds().length')) === out);
  await page.keyboard.press('Control+y'); await page.waitForTimeout(200);
  ok('6 Redo re-applies reposition', (await ev('AW.wall.outOfBounds().length')) === 0);
  await page.click('[data-dock="undo"]'); await page.waitForTimeout(150);
  ok('6 Fit Proportionally offered', await page.locator('[data-b="fit"]').isVisible());
  await page.click('[data-b="fit"]'); await page.waitForTimeout(200);
  ok('6 Fit Proportionally brings all inside', (await ev('AW.wall.outOfBounds().length')) === 0);
  // 7. layouts
  await page.click('[data-dock="layouts"]'); await page.waitForTimeout(200);
  await page.click('[data-lay="save"]'); await page.fill('#prompt-text', 'Morning shift'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok('7 layout saved and persisted', (await ev('JSON.parse(localStorage.getItem("aegiswall.layouts")).length')) === 1);
  await page.click('[data-lay="rename"]'); await page.fill('#prompt-text', 'Day shift'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok('7 layout renamed', (await ev('AW.wall.layouts.list()[0].name')) === 'Day shift');
  const itemsSaved = await ev('AW.wall.S.draft.items.length');
  await ev('AW.wall.removeItem(AW.wall.S.draft.items[0].id)'); await ev('AW.wall.setGrid(4,3)');
  await page.locator('label:has(input[name="shelf-view"][value="list"])').click(); await page.waitForTimeout(150);
  await page.click('[data-lay="load"]'); await page.waitForTimeout(900);
  ok('7 layout reloaded into draft', (await ev('AW.wall.S.draft.items.length')) === itemsSaved && (await ev('AW.wall.S.draft.cols')) === 3);
  await T.shot('a-7-shelf');
  // 8. apply ack, then failure + retry
  ok('8 pending shown before apply', (await ev('AW.wall.pending().n')) > 0, await page.textContent('#hd-pending'));
  await page.click('#hd-apply'); await page.waitForTimeout(250);
  ok('8 indeterminate sending state', (await page.textContent('#hd-apply')).includes('Sending') && await page.locator('#apply-bar').isVisible());
  await page.click('#hd-apply', { force: true }).catch(() => {});
  await page.waitForTimeout(1300);
  ok('8 acknowledged -> no pending, confirmed updated', (await ev('AW.wall.pending().n')) === 0, await page.textContent('#hd-pending'));
  await ev('AW.demo.failNextApply = true'); await ev('AW.wall.setGrid(4,3)'); await page.waitForTimeout(100);
  const draftBefore = await ev('JSON.stringify(AW.wall.S.draft)');
  await page.click('#hd-apply'); await page.waitForTimeout(1500);
  ok('8 failure keeps draft, shows reason', (await ev('JSON.stringify(AW.wall.S.draft)')) === draftBefore && (await page.textContent('#hd-pending')).includes('failed'), await ev('AW.wall.S.applyError'));
  await T.shot('a-8-fail');
  await page.click('#hd-apply'); await page.waitForTimeout(1500);
  ok('8 retry succeeds', (await ev('AW.wall.pending().n')) === 0 && !(await ev('AW.wall.S.applyError')));
  await page.click('[data-lay="delete"]'); await page.locator('.dialog .btn-danger').click(); await page.waitForTimeout(200);
  ok('7 layout deleted', (await ev('AW.wall.layouts.list().length')) === 0);
  await T.done();
})().catch((e) => { console.log('TEST CRASH', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
