// BiggGengo main process: window, saved data, voices, updates.
const { app, BrowserWindow, ipcMain, dialog, shell, screen, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const azure = require('./azure.js');

app.setAppUserModelId('com.laurmoe.bigggengo');
if (!app.requestSingleInstanceLock()) app.quit();

const dataFile = () => path.join(app.getPath('userData'), 'data.json');
const icon = () => path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
let win = null, quitting = false;
let cache = null; // last saved state (the updater reads the autoUpdate setting from it)

function readData() {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return null; }
}
function writeData(state) {
  const f = dataFile(), tmp = f + '.tmp';
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const b = path.join(path.dirname(f), 'backup-' + new Date().toISOString().slice(0, 10) + '.json');
  if (fs.existsSync(f) && !fs.existsSync(b)) fs.copyFileSync(f, b); // one backup per day, before the first save of the day
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, f);
}

// Zoom (Ctrl + / Ctrl - / Ctrl 0) is remembered between runs.
const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
const readPrefs = () => { try { return JSON.parse(fs.readFileSync(prefsFile(), 'utf8')); } catch { return {}; } };
function setZoom(z) {
  z = Math.min(1.6, Math.max(0.6, Math.round(z * 10) / 10));
  if (win && !win.isDestroyed()) win.webContents.setZoomFactor(z);
  try { fs.writeFileSync(prefsFile(), JSON.stringify(Object.assign(readPrefs(), { zoom: z }))); } catch {}
}

// `--quiet` (used when the app is started for testing): the window is never shown, so nothing pops up on the screen
const QUIET = process.argv.includes('--quiet');
function createWindow() {
  const wa = screen.getPrimaryDisplay().workAreaSize; // a good part of the screen (15% less than before)
  win = new BrowserWindow({
    width: Math.min(1500, Math.round(wa.width * 0.82)), height: Math.min(1064, Math.round(wa.height * 0.92)), minWidth: 820, minHeight: 560,
    backgroundColor: '#0f1c2b', title: 'BiggGengo', autoHideMenuBar: true, icon: icon(), show: !QUIET, skipTaskbar: QUIET,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false, backgroundThrottling: !QUIET },
  });
  win.removeMenu();
  // Run from the project folder, Windows would show the generic Electron icon on the taskbar: give the window the pig icon and
  // tell the taskbar which shortcut to use when you pin it (the same one as the desktop shortcut).
  if (process.platform === 'win32' && !app.isPackaged) {
    try { win.setAppDetails({ appId: 'com.laurmoe.bigggengo', appIconPath: path.join(__dirname, 'build', 'icon.ico'), appIconIndex: 0, relaunchDisplayName: 'BiggGengo', relaunchCommand: '"' + process.execPath + '" "' + app.getAppPath() + '"' }); } catch {}
  }
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = String(input.key || '').toLowerCase();
    if (input.control && (k === '=' || k === '+')) { e.preventDefault(); setZoom(win.webContents.getZoomFactor() + 0.1); }
    else if (input.control && k === '-') { e.preventDefault(); setZoom(win.webContents.getZoomFactor() - 0.1); }
    else if (input.control && k === '0') { e.preventDefault(); setZoom(1); }
    // Running from the project folder (not installed): Ctrl+R or F5 reloads the screens, so a change to renderer/ shows instantly.
    else if (!app.isPackaged && ((input.control && k === 'r') || k === 'f5')) { e.preventDefault(); win.webContents.reloadIgnoringCache(); }
  });
  win.webContents.once('did-finish-load', () => { const z = readPrefs().zoom; if (z) win.webContents.setZoomFactor(z); });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:/.test(url)) shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
}
function showWin() { if (QUIET) return; if (!win) createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

// There is no offline voice engine bundled: Windows' own Japanese voice (in the page) and the online Azure voices below do the speaking.
// VOICEVOX (free, offline, https://voicevox.hiroshiba.jp): when its app or engine is running, its voices show up here. It listens on 127.0.0.1:50021 only.
const VV = 'http://127.0.0.1:50021';
async function vvFetch(p, init, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 15000);
  try { const r = await fetch(VV + p, Object.assign({ signal: ctl.signal }, init)); if (!r.ok) throw new Error('VOICEVOX HTTP ' + r.status); return r; } finally { clearTimeout(t); }
}
ipcMain.handle('tts:voices', async () => {
  try { const sp = await (await vvFetch('/speakers', {}, 900)).json(); return sp.flatMap((s) => (s.styles || []).map((st) => ({ id: 'vv:' + st.id, name: s.name + (st.name && st.name !== 'ノーマル' ? ' (' + st.name + ')' : '') }))).slice(0, 80); } catch { return []; }
});
async function vvJob(out, text, id, ls) {
  const q = await (await vvFetch('/audio_query?speaker=' + id + '&text=' + encodeURIComponent(text), { method: 'POST' })).json();
  q.speedScale = Math.min(2, Math.max(0.5, 1 / ls));
  const buf = Buffer.from(await (await vvFetch('/synthesis?speaker=' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) }, 30000)).arrayBuffer());
  const tmp = out + '.tmp'; fs.writeFileSync(tmp, buf); fs.renameSync(tmp, out);
  return buf;
}
// Online voices (Azure Speech). The key is encrypted with Windows' own protection (safeStorage) and kept in its own file next to the data,
// never in data.json, so it does not end up in exports or backups. Every clip is cached, so a word you have heard once plays offline later.
const azFile = () => path.join(app.getPath('userData'), 'azure.json');
const azRead = () => { try { return JSON.parse(fs.readFileSync(azFile(), 'utf8')); } catch { return {}; } };
const azWrite = (o) => { const tmp = azFile() + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, azFile()); };
function azKey() { const c = azRead(); if (!c.key || !safeStorage.isEncryptionAvailable()) return ''; try { return safeStorage.decryptString(Buffer.from(c.key, 'base64')); } catch { return ''; } }
let azLast = ''; const azTold = {};
function azProblem(e) { // remember what went wrong and tell the page, at most once every five minutes per kind of problem
  azLast = e.code || 'server';
  if (win && !win.isDestroyed() && Date.now() - (azTold[azLast] || 0) > 300000) { azTold[azLast] = Date.now(); win.webContents.send('azure:problem', azLast); }
}
async function azSynth(text, voice, ls) {
  const key = azKey(), month = azure.monthOf(), c = azRead();
  if (!key) throw new azure.AzureError('auth', 'no key');
  if (!azure.canSpend(c.usage, month, text.length)) throw new azure.AzureError('limit', 'the free characters of this month are used up');
  const buf = await azure.synthesize({ key, region: c.region || 'japaneast', voice, text, ls });
  const c2 = azRead(); c2.usage = azure.addUsage(c2.usage, month, text.length); azWrite(c2);
  return buf;
}
ipcMain.handle('azure:get', () => { const c = azRead(), m = azure.monthOf(); return { hasKey: !!azKey(), region: c.region || 'japaneast', month: m, chars: azure.usedIn(c.usage, m), limit: azure.FREE_CHARS, safe: azure.SAFE_CHARS, secure: safeStorage.isEncryptionAvailable(), last: azLast }; });
ipcMain.handle('azure:set', (_e, key, region) => {
  region = String(region || '').trim().toLowerCase(); key = String(key || '').trim();
  if (!azure.validRegion(region)) return Promise.reject(new Error('That region does not look right. It is a short name like westeurope.'));
  const c = azRead(); c.region = region;
  if (key) {
    if (!/^[A-Za-z0-9_-]{20,120}$/.test(key)) return Promise.reject(new Error('That does not look like a Speech key. Copy "Key 1" from the Azure portal.'));
    if (!safeStorage.isEncryptionAvailable()) return Promise.reject(new Error('Windows could not protect the key on this PC, so it was not saved.'));
    c.key = safeStorage.encryptString(key).toString('base64');
  }
  azWrite(c); azLast = ''; return true;
});
ipcMain.handle('azure:clear', () => { const c = azRead(); delete c.key; azWrite(c); azLast = ''; return true; });
ipcMain.handle('azure:test', async () => { try { await azSynth('こんにちは、これは私の声のテストです。', 'ja-JP-NanamiNeural', 1); azLast = ''; return { ok: true }; } catch (e) { return { ok: false, code: e.code || 'server', message: e.message }; } });

const ttsInflight = new Map(); // identical requests share one run
async function azureJob(out, text, voice, ls) {
  try {
    const buf = await azSynth(text, voice, ls);
    const tmp = out + '.tmp'; fs.writeFileSync(tmp, buf); fs.renameSync(tmp, out);
    return buf;
  } catch (e) { // no key, no internet, the free characters used up...: the page is told, and the Windows voice reads it instead
    azProblem(e);
    throw e;
  }
}
function synth(text, voice, ls) { // voice: "az:ja-JP-NanamiNeural" (an Azure voice) or "vv:3" (a VOICEVOX style)
  const cache = path.join(app.getPath("userData"), "tts-cache");
  fs.mkdirSync(cache, { recursive: true });
  const out = path.join(cache, crypto.createHash("sha1").update(voice + "|" + ls.toFixed(2) + "|" + text).digest("hex") + (voice.startsWith('vv:') ? '.wav' : '.mp3'));
  if (fs.existsSync(out)) { const now = new Date(); try { fs.utimesSync(out, now, now); } catch {} return Promise.resolve(fs.readFileSync(out)); }
  if (ttsInflight.has(out)) return ttsInflight.get(out);
  const job = (voice.startsWith('vv:') ? vvJob(out, text, voice.slice(3), ls) : azureJob(out, text, voice.slice(3), ls)).finally(() => ttsInflight.delete(out));
  ttsInflight.set(out, job);
  return job;
}
ipcMain.handle("tts:speak", (_e, text, voice, lengthScale) => {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text) return Promise.reject(new Error("empty text"));
  voice = String(voice || '');
  if (!(/^vv:\d{1,6}$/.test(voice) || (voice.startsWith('az:') && azure.validVoice(voice.slice(3))))) return Promise.reject(new Error("unknown voice"));
  return synth(text, voice, Math.min(2.5, Math.max(0.5, Number(lengthScale) || 1)));
});
function trimCache() { // keep the audio cache from growing forever: drop clips not used for a month
  try {
    const dir = path.join(app.getPath('userData'), 'tts-cache');
    for (const f of fs.readdirSync(dir)) { const fp = path.join(dir, f); if (Date.now() - fs.statSync(fp).atimeMs > 30 * 864e5) fs.unlinkSync(fp); }
  } catch {}
}

// Updates: checks the GitHub releases of laurmoe7/bigg-gengo (build.publish in package.json), downloads quietly, installs on restart.
const updateState = { status: 'idle', version: '', percent: 0, error: '' };
function setUpdate(patch) {
  Object.assign(updateState, patch);
  if (win && !win.isDestroyed()) win.webContents.send('update:state', updateState);
}
let updaterOn = false;
function initUpdater() {
  // Installed app: use the release feed. Dev run: only when VT_UPDATE_URL points at a test server (never in the installed app).
  if (app.isPackaged) updaterOn = true;
  else if (process.env.VT_UPDATE_URL) { autoUpdater.forceDevUpdateConfig = true; autoUpdater.setFeedURL({ provider: 'generic', url: process.env.VT_UPDATE_URL }); updaterOn = true; }
  if (!updaterOn) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => setUpdate({ status: 'checking', error: '' }));
  autoUpdater.on('update-available', (i) => setUpdate({ status: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => setUpdate({ status: 'current' }));
  autoUpdater.on('download-progress', (p) => setUpdate({ status: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (i) => {
    setUpdate({ status: 'ready', version: i.version, percent: 100 });
  });
  autoUpdater.on('error', (e) => setUpdate({ status: 'error', error: String((e && e.message) || e).slice(0, 200) }));
}
function checkUpdates(manual) {
  if (!updaterOn) return;
  if (!manual && cache && cache.settings && cache.settings.autoUpdate === false) return;
  if (updateState.status === 'downloading' || updateState.status === 'ready') return;
  autoUpdater.checkForUpdates().catch(() => {});
}
ipcMain.handle('update:state', () => updateState);
ipcMain.handle('update:check', () => { if (!updaterOn) setUpdate({ status: 'unavailable' }); else checkUpdates(true); });
// Silent install (no wizard), then the app reopens by itself.
ipcMain.handle('update:install', () => { quitting = true; autoUpdater.quitAndInstall(true, true); });
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('data:load', () => { cache = readData(); return cache; });
ipcMain.handle('data:save', (_e, state) => { cache = state; writeData(state); return true; });
ipcMain.handle('data:where', () => dataFile());
ipcMain.handle('data:reveal', () => { shell.showItemInFolder(dataFile()); });
ipcMain.handle('app:login', (_e, on) => { app.setLoginItemSettings({ openAtLogin: !!on }); return true; });
ipcMain.handle('file:export', async (_e, text, name) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text);
  return r.filePath;
});
ipcMain.handle('file:import', async () => {
  const r = await dialog.showOpenDialog(win, { defaultPath: app.getPath('documents'), properties: ['openFile'], filters: [{ name: 'JSON, text or CSV', extensions: ['json', 'txt', 'csv'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return { name: path.basename(r.filePaths[0]), text: fs.readFileSync(r.filePaths[0], 'utf8') };
});

app.on('second-instance', showWin);
app.whenReady().then(() => {
  trimCache();
  cache = readData();
  createWindow();
  initUpdater();
  setTimeout(() => checkUpdates(false), 8000);
  setInterval(() => checkUpdates(false), 6 * 3600 * 1000);
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => app.quit());
