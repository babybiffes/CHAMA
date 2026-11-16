// Acceptance steps 16-20: settings, network, database, logs, console, roles, fallback, reduced motion
const { open } = require('./lib');
const fs = require('fs');
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : ''));
(async () => {
  let T = await open(); let { page, ev } = T;
  {
  await T.login('admin');
  const go = async (ws, cat) => { await page.click('#rail [data-ws="' + ws + '"]'); await page.waitForTimeout(300); if (cat) { await page.click('#set-cats [data-cat="' + cat + '"]'); await page.waitForTimeout(250); } };
  const seg = (name, value) => page.locator('label:has(input[name="' + name + '"][value="' + value + '"])').click();
  const lic = await ev('AW.svc.license.generate({edition:"enterprise",features:["audio.presets","maint.console","config.transfer"],expiresAt:null,deviceLimit:5}).then(r=>AW.svc.license.activate(r.token)).then(r=>r.state)');
  ok('setup: enterprise demo license active', lic === 'activated');
  // ---------- 19. wall view uncluttered
  ok('19 wall view has no charts, db fields, mixer or console', await ev('!document.querySelector("#ws-wall .chart, #ws-wall .cn-out, #ws-wall .au-table, #ws-wall [id^=db-]")'));
  // ---------- 16. preview quality + reload interval
  await go('settings', 'rendering');
  await seg('set-rendering-quality-r', 'low'); await page.waitForTimeout(150);
  ok('16 preset fills dependent fields in the draft only', (await ev('AW.settingsUI.drafts.rendering.previewRes')) === 320 && (await ev('AW.prefs.previewRes')) === 480);
  await page.click('[data-form="save"]'); await page.waitForTimeout(300);
  ok('16 saved preview quality takes effect', (await ev('AW.prefs.previewRes')) === 320 && (await ev('AW.compositor.tw')) === 320 && (await ev('AW.prefs.reflections')) === false);
  ok('16 wall output quality is read-only and separate', (await page.textContent('[data-row="wallOut"]')).includes('Read-only'));
  await page.locator('#set-main details[data-adv] > summary').click();
  await page.fill('#set-rendering-liveLimit', '99'); await page.locator('#set-rendering-liveLimit').dispatchEvent('change'); await page.waitForTimeout(150);
  ok('20 invalid value blocked with message', (await page.textContent('[data-row="liveLimit"]')).includes('Must be between') );
  await page.click('[data-form="save"]'); await page.waitForTimeout(200);
  ok('20 invalid value is not saved', (await ev('AW.prefs.liveLimit')) === 4);
  await page.click('[data-form="cancel"]'); await page.waitForTimeout(150);
  await page.click('#set-cats [data-cat="appearance"]'); await seg('set-appearance-theme-r', 'light'); await page.waitForTimeout(100);
  ok('unsaved draft is flagged in the category list', (await page.locator('#set-cats .unsaved').count()) === 1);
  await page.click('#set-cats [data-cat="account"]'); await page.click('#set-cats [data-cat="appearance"]');
  ok('draft preserved when switching category', (await ev('AW.settingsUI.drafts.appearance.theme')) === 'light' && (await ev('document.documentElement.dataset.theme || "none"')) === 'none');
  await page.click('[data-form="save"]'); await page.waitForTimeout(250);
  ok('20 theme setting applies', (await ev('document.documentElement.dataset.theme')) === 'light'); await T.shot('e-light');
  await page.click('[data-form="defaults"]'); await page.click('[data-form="save"]'); await page.waitForTimeout(200);
  ok('Restore Defaults for the category works', (await ev('AW.prefs.theme')) === 'system');
  await page.fill('#set-search', 'frame rate'); await page.waitForTimeout(150);
  ok('settings search finds a setting', (await page.locator('#set-cats .set-hit').count()) >= 1, await page.locator('#set-cats .set-hit').first().textContent());
  await page.locator('#set-cats .set-hit').first().click(); await page.waitForTimeout(200);
  ok('search result opens its category', (await ev('AW.settingsUI.cat')) === 'rendering'); await page.fill('#set-search', '');
  await go('settings', 'reload');
  await page.selectOption('#set-reload-defaultInterval', '30'); await page.waitForTimeout(100);
  await page.selectOption('[data-src-iv="yt-1"]', '0'); await page.waitForTimeout(100);
  await page.click('[data-form="save"]'); await page.waitForTimeout(200);
  ok('16 change summary before disruptive apply', (await page.textContent('.dialog')).includes('interrupts playback'));
  await page.locator('.dialog footer .btn-primary').click(); await page.waitForTimeout(700);
  ok('16 reload interval saved on the controller store', (await ev('AW.svc.config.section("reload").defaultInterval')) === 30 && (await ev('AW.svc.reload.effective("yt-1")')) === 0 && (await ev('AW.svc.reload.effective("web-3")')) === 30);
  await page.locator('[data-reload-now="web-3"]').click(); await page.waitForTimeout(200);
  ok('16 Reload Now runs once, no queue', (await ev('AW.svc.reload.state("web-3").busy')) && await ev('AW.svc.reload.now("web-3","manual").then(()=>false, e => e.code === "busy")'));
  await page.waitForTimeout(1500);
  ok('16 reload completes with status', (await ev('AW.svc.reload.state("web-3").status')) === 'ok');
  // persistence across reload
  await page.reload(); await T.login('admin');
  ok('16 settings persist after page reload', (await ev('AW.prefs.previewRes')) === 320 && (await ev('AW.svc.config.section("reload").defaultInterval')) === 30 && (await ev('AW.svc.license.status().state')) === 'valid');
  // ---------- 17. network
  await go('settings', 'network');
  await seg('net-mode-r', 'https'); await page.waitForTimeout(100);
  await page.click('[data-form="test"]'); await page.waitForTimeout(1000);
  ok('17 HTTPS without certificate fails validation', (await page.textContent('#set-main')).includes('HTTPS needs a certificate'));
  await page.selectOption('#net-certId', 'cert-expired'); await page.click('[data-form="test"]'); await page.waitForTimeout(1000);
  ok('17 expired certificate detected', (await page.textContent('.checks-list')).includes('Expired on'));
  await page.selectOption('#net-certId', 'cert-wronghost'); await page.click('[data-form="test"]'); await page.waitForTimeout(1000);
  ok('17 hostname coverage error detected', (await page.textContent('.checks-list')).includes('not aegis-ctrl-01.local'));
  await page.selectOption('#net-certId', 'cert-keymismatch'); await page.click('[data-form="test"]'); await page.waitForTimeout(1000);
  ok('17 key mismatch detected', (await page.textContent('.checks-list')).includes('does not belong'));
  await page.selectOption('#net-certId', 'cert-ok'); await page.fill('#net-httpsPort', '443'); await page.locator('#net-httpsPort').dispatchEvent('change'); await page.click('[data-form="test"]'); await page.waitForTimeout(1000);
  ok('17 privileged port refused', (await page.textContent('.checks-list')).includes('elevated privileges'));
  await page.fill('#net-httpsPort', '5432'); await page.locator('#net-httpsPort').dispatchEvent('change'); await page.click('[data-form="test"]'); await page.waitForTimeout(1000);
  ok('17 port in use detected', (await page.textContent('.checks-list')).includes('in use by PostgreSQL'));
  await page.fill('#net-httpsPort', '8443'); await page.locator('#net-httpsPort').dispatchEvent('change');
  ok('17 proposed URL shown next to current', (await page.textContent('#set-main .kv')).includes('https://aegis-ctrl-01.local:8443') && (await page.textContent('#set-main .kv')).includes('http://aegis-ctrl-01.local:8765'));
  await ev('AW.demo.endpointUnreachable = true');
  await page.click('[data-form="apply"]'); await page.locator('.dialog footer .btn-primary').click();
  await page.waitForFunction(() => /previous configuration was restored/.test(document.body.textContent), null, { timeout: 20000 });
  ok('17 unreachable endpoint -> rollback and recovery', (await ev('AW.svc.config.section("network").mode')) === 'http' && (await ev('AW.svc.conn.state')) === 'online');
  await T.shot('e-17-rollback');
  await page.locator('.dialog footer .btn-primary').click(); await ev('AW.demo.endpointUnreachable = false');
  await page.click('[data-form="apply"]'); await page.locator('.dialog footer .btn-primary').click();
  await page.waitForFunction(() => /new address answered/.test(document.body.textContent), null, { timeout: 20000 });
  ok('17 valid HTTPS config applied after reconnection', (await ev('AW.svc.config.section("network").mode')) === 'https' && (await ev('AW.svc.config.section("network").httpsPort')) === 8443);
  await page.locator('.dialog footer .btn-primary').click();
  // ---------- 18. database
  await go('settings', 'database');
  await page.selectOption('#db-engine', 'postgresql'); await page.fill('#db-host', 'db.invalid'); await page.locator('#db-host').dispatchEvent('change'); await page.fill('#db-user', 'aegis'); await page.locator('#db-user').dispatchEvent('change');
  ok('18 save blocked until the connection is tested', await page.locator('[data-form="db-save"]').isDisabled());
  await page.click('[data-form="db-test"]'); await page.waitForTimeout(1200);
  ok('18 failed test reported, last working kept', (await page.textContent('#set-main')).includes('could not be resolved') && (await ev('AW.svc.config.section("db").engine')) === 'sqlite');
  await page.fill('#db-host', 'db01.plant.local'); await page.locator('#db-host').dispatchEvent('change'); await page.fill('#db-password', 's3cret-Pa55'); await page.locator('#db-password').dispatchEvent('change');
  await page.click('[data-form="db-test"]'); await page.waitForTimeout(1200);
  ok('18 test passes and migration notice shown', (await page.textContent('#set-main')).includes('Connection test passed') && (await page.textContent('#set-main')).includes('requires migrating'));
  await page.click('[data-form="db-save"]'); await page.locator('.dialog .btn-danger').click(); await page.waitForTimeout(700);
  ok('18 connection saved; password never stored client-side in clear', (await ev('AW.svc.config.section("db").engine')) === 'postgresql' && !(await ev('JSON.stringify(localStorage)')).includes('s3cret-Pa55'));
  await ev('AW.wall.layouts.save("Keep me")');
  const [bk] = await Promise.all([page.waitForEvent('download'), page.click('[data-form="bk-now"]')]);
  const bkText = fs.readFileSync(await bk.path(), 'utf8'), bkObj = JSON.parse(bkText);
  ok('18 Backup Now produces a usable artifact', bkObj.format === 'aegiswall-backup/1' && bkObj.data.layouts.length === 1 && !/s3cret/.test(bkText), bk.suggestedFilename());
  await ev('AW.wall.layouts.remove(AW.wall.layouts.list()[0].id)');
  await page.locator('[data-form="bk-restore"]').first().click(); await page.waitForTimeout(200);
  ok('18 restore explains replacement and needs typed confirmation', (await page.textContent('.dialog')).includes('safety backup') && await page.locator('.dialog .btn-danger').isDisabled());
  await page.fill('#confirm-phrase', 'RESTORE'); await page.locator('.dialog .btn-danger').click(); await page.waitForTimeout(4500);
  ok('18 restore brings data back and keeps a safety backup', (await ev('AW.wall.layouts.list().length')) === 1 && (await ev('AW.svc.db.backups().some(b => b.reason === "pre-restore")')));
  // ---------- 18. logs
  await go('settings', 'logs');
  const total = await ev('AW.logs.all().length');
  await page.selectOption('#lg-level', 'error'); await page.waitForTimeout(150);
  const errRows = await page.locator('#lg-table tbody tr').count();
  ok('18 severity filter', errRows > 0 && errRows < total, { total, errRows });
  await page.selectOption('#lg-level', 'debug'); await page.fill('#lg-q', 'backup'); await page.waitForTimeout(200);
  ok('18 search filter', (await page.locator('#lg-table tbody tr').count()) >= 1);
  const [lg] = await Promise.all([page.waitForEvent('download'), page.click('[data-form="export"]')]);
  const lgText = fs.readFileSync(await lg.path(), 'utf8');
  ok('18 log export contains the filtered rows', lgText.includes('secrets redacted') && /Backup created/.test(lgText));
  await page.fill('#lg-q', ''); await page.click('[data-form="clear-view"]'); await page.waitForTimeout(150);
  ok('18 Clear View empties the view only', (await page.locator('#lg-table tbody tr').count()) === 0 && (await ev('AW.logs.all().length')) >= total);
  await page.click('[data-form="tab-audit"]'); await page.click('[data-form="unclear"]'); await page.waitForTimeout(150);
  ok('18 audit trail is separate', (await page.textContent('#lg-table')).includes('license.generated'));
  // ---------- 18. console
  await go('settings', 'console');
  await page.fill('#cn-in', 'service status'); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  ok('18 console success with structured output', (await page.textContent('#cn-out')).includes('AegisWall Application Service') && (await page.textContent('#cn-out')).includes('exit 0'));
  await page.fill('#cn-in', 'rm -rf /'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  ok('18 console failure (not allowlisted)', (await page.textContent('#cn-out')).includes('exit 127'));
  await page.fill('#cn-in', 'ping gateway'); await page.keyboard.press('Enter'); await page.waitForTimeout(1100);
  await page.click('[data-form="cn-cancel"]'); await page.waitForTimeout(500);
  ok('18 console cancel', (await page.textContent('#cn-out')).includes('cancelled') && (await page.textContent('#cn-out')).includes('exit 130'));
  await page.focus('#cn-in'); await page.keyboard.press('ArrowUp');
  ok('18 console history recall', (await page.inputValue('#cn-in')) === 'ping gateway');
  await T.shot('e-18-console');
  // concurrent edit detection
  await go('settings', 'reload'); await page.selectOption('#set-reload-defaultInterval', '60'); await page.waitForTimeout(100);
  await ev('AW.svc.config.simulateConcurrentEdit()');
  await page.click('[data-form="save"]'); await page.locator('.dialog footer .btn-primary').click(); await page.waitForTimeout(700);
  ok('stale concurrent edit is refused', (await ev('AW.svc.config.section("reload").defaultInterval')) === 30 && (await page.textContent('#set-main')).includes('newer configuration'));
  // ---------- 20. roles
  await ev('AW.app.signOut()'); await page.click('[data-demo="operator"]'); await page.waitForTimeout(700);
  ok('20 work preserved across sign-out/in', (await ev('AW.wall.S.draft.items.length')) > 0 && (await ev('AW.session.role')) === 'operator');
  await go('system'); 
  ok('20 operator cannot restart (UI)', await page.locator('[data-s="restart-service"]').isDisabled() && await page.locator('[data-s="diag"]').isDisabled());
  ok('20 operator refused by service layer', await ev('AW.svc.maint.restart("service").then(()=>false, e => e.code === "forbidden")') && await ev('AW.svc.license.generate({edition:"standard",features:[],deviceLimit:1}).then(()=>false, e => e.code === "forbidden")') && await ev('AW.svc.config.save("reload", AW.svc.config.section("reload")).then(()=>false, e => e.code === "forbidden")'));
  await go('settings', 'network'); ok('20 operator sees network read-only', await page.locator('#net-hostname').isDisabled());
  await ev('AW.app.signOut()'); await page.click('[data-demo="tech"]'); await page.waitForTimeout(700);
  await go('system'); ok('20 technician can restart, not change network', await page.locator('[data-s="restart-service"]').isEnabled() && await ev('AW.svc.net.test(AW.svc.config.section("network")).then(()=>false, e => e.code === "forbidden")'));
  await T.done();
  }

  // ---------- 20. WebGL initialization failure
  T = await open({ keep: false }); page = T.page; ev = T.ev;
  await ev('localStorage.setItem("aegiswall.demo.noWebGL", "true")'); await page.reload();
  await page.click('[data-demo="admin"]'); await page.waitForTimeout(900);
  ok('20 WebGL failure -> 2D fallback, app still works', (await ev('AW.stage.kind')) === '2d' && await page.locator('#stage-note').isVisible(), (await page.textContent('#stage-note')).slice(0, 70));
  await page.locator('label:has(input[value="edit"])').click(); await page.waitForTimeout(400);
  await page.hover('.src'); await page.click('.src [data-add]'); await page.waitForTimeout(300);
  const f = await page.locator('.frame.sel').boundingBox();
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2); await page.mouse.down(); await page.mouse.move(f.x + f.width / 2 + 40, f.y + f.height / 2 + 30, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(200);
  ok('20 fallback supports basic editing and apply', (await ev('AW.wall.S.hist.length')) >= 2);
  await page.click('#hd-apply'); await page.waitForTimeout(300); if (await page.locator('.dialog').isVisible()) { console.log('  (confirm shown: ' + (await page.textContent('.dialog h2')) + ')'); await page.locator('.dialog footer .btn-primary').click(); } await page.waitForTimeout(1400); ok('20 apply works in fallback', (await ev('AW.wall.pending().n')) === 0);
  await T.shot('f-fallback'); await page.click('#rail [data-ws="audio"]'); await page.waitForTimeout(300); ok('20 other workspaces work without WebGL', await page.locator('#au-vol').isVisible());
  await T.done();

  // ---------- 12. reduced motion
  T = await open({ reduced: true }); page = T.page; ev = T.ev;
  await page.click('[data-demo="admin"]'); await page.waitForTimeout(700);
  ok('12 reduced motion: no intro, controls ready', !(await ev('AW.stage.introPlaying')) && (await ev('AW.motion.level()')) === 'reduced' && !(await page.locator('#intro').isVisible()));
  await page.locator('label:has(input[value="edit"])').click(); await page.waitForTimeout(500);
  ok('12 reduced motion: view change is immediate', await ev('AW.stage.aligned()'));
  // keyboard operation
  await page.locator('.frame').first().focus(); const x0 = await ev('AW.wall.selectedItem() ? AW.wall.selectedItem().x : null');
  const locked = await ev('AW.wall.selectedItem().locked');
  await page.locator('.frame').nth(1).focus(); const x1 = await ev('AW.wall.selectedItem().x');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
  ok('12 keyboard moves content', (await ev('AW.wall.selectedItem().x')) === x1 + 10, { x0, locked });
  await page.keyboard.press('Delete'); await page.waitForTimeout(150);
  ok('12 Delete removes content, undo toast offered', (await ev('AW.wall.S.draft.items.length')) === 5 && (await page.locator('.toast [data-act]').count()) === 1);
  await T.done();

  // ---------- small screen
  T = await open({ viewport: { width: 400, height: 780 } }); page = T.page; ev = T.ev;
  await T.login('admin'); await page.waitForTimeout(800); await T.shot('g-phone-wall');
  ok('phone: no horizontal page scroll', await ev('document.documentElement.scrollWidth <= window.innerWidth'));
  await page.click('#lib-tab'); await page.waitForTimeout(400); await T.shot('g-phone-lib');
  await page.click('#rail [data-ws="settings"]'); await page.waitForTimeout(400); await T.shot('g-phone-settings');
  ok('phone: settings fit', await ev('document.documentElement.scrollWidth <= window.innerWidth'));
  await T.done();
})().catch((e) => { console.log('TEST CRASH', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
