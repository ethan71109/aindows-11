/* ============ AIndows 11 — desktop shell (Electron) ============
 * Wraps the web OS in a native window, keeps it up to date, and — when the
 * user opts in — bridges dreamed apps to the REAL filesystem, with every
 * single operation gated behind a native confirmation dialog.
 */

const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const path = require("path");
const fsp = require("fs/promises");
const { autoUpdater } = require("electron-updater");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    title: "AIndows 11",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));

  // Real links (like platform.claude.com) open in the real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

/* ---------------- real filesystem, gated ---------------- */

// The AIndows "home" folder — where relative filenames resolve and where
// os.listFiles() looks by default. Created on demand.
let homeDir = null;
async function ensureHome() {
  if (!homeDir) homeDir = path.join(app.getPath("documents"), "AIndows");
  await fsp.mkdir(homeDir, { recursive: true });
  return homeDir;
}

async function resolveTarget(p) {
  if (!p) throw new Error("no path given");
  return path.isAbsolute(p) ? path.resolve(p) : path.join(await ensureHome(), p);
}

function kindByExt(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ({
    txt: "text", md: "text", json: "data", csv: "data", html: "webpage",
    png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
    bmp: "image", svg: "image", mp3: "audio", wav: "audio", pdf: "document",
  })[ext] || "file";
}

const IMG_MIME = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
};

// Session-only permission grants (cleared on quit). Deletes are never granted.
const grants = { read: new Set(), write: new Set() };
function hasGrant(kind, dir) {
  for (const g of grants[kind]) {
    if (dir === g || dir.startsWith(g + path.sep)) return true;
  }
  return false;
}

async function gate(kind, target, isDir, appName) {
  const dir = isDir ? target : path.dirname(target);
  if (hasGrant(kind, dir)) return;
  const verb = kind === "read" ? "read" : "save files in";
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Deny", "Allow once", "Allow this folder"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    title: "AIndows wants your files",
    message: `${appName || "An app"} wants to ${verb}:`,
    detail:
      (isDir ? dir : target) +
      "\n\nThis is a real location on your PC, and this app was written by AI. " +
      'Only allow it if you expected this. "Allow this folder" trusts it until you quit.',
  });
  if (response === 0) throw new Error("Permission denied.");
  if (response === 2) grants[kind].add(dir);
}

async function gateDelete(target, appName) {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    buttons: ["Deny", "Delete permanently"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    title: "Delete a real file?",
    message: `${appName || "An app"} wants to permanently delete:`,
    detail: target + "\n\nThis cannot be undone.",
  });
  if (response !== 1) throw new Error("Delete denied.");
}

ipcMain.handle("hostfs:list", async (_e, { dir, app: appName }) => {
  const target = dir ? path.resolve(dir) : await ensureHome();
  await gate("read", target, true, appName);
  const ents = await fsp.readdir(target, { withFileTypes: true });
  const out = [];
  for (const d of ents.slice(0, 500)) {
    const full = path.join(target, d.name);
    let size = 0, modified = "";
    try {
      const st = await fsp.stat(full);
      size = st.size;
      modified = st.mtime.toISOString().slice(0, 10);
    } catch { /* unreadable entry — list it anyway */ }
    out.push({
      name: d.name, path: full, folder: target,
      kind: d.isDirectory() ? "folder" : kindByExt(d.name),
      size, modified,
    });
  }
  return out;
});

ipcMain.handle("hostfs:read", async (_e, { path: p, app: appName }) => {
  const target = await resolveTarget(p);
  await gate("read", target, false, appName);
  const st = await fsp.stat(target);
  if (st.size > 8 * 1024 * 1024) throw new Error("file too large to open (8 MB max)");
  const ext = path.extname(target).toLowerCase();
  if (IMG_MIME[ext]) {
    const buf = await fsp.readFile(target);
    return `data:${IMG_MIME[ext]};base64,${buf.toString("base64")}`;
  }
  return await fsp.readFile(target, "utf8");
});

ipcMain.handle("hostfs:write", async (_e, { path: p, content, app: appName }) => {
  const target = await resolveTarget(p);
  await gate("write", target, false, appName);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const m = /^data:([^;]+);base64,(.*)$/s.exec(String(content || ""));
  if (m) await fsp.writeFile(target, Buffer.from(m[2], "base64"));
  else await fsp.writeFile(target, String(content ?? ""), "utf8");
  return { ok: true, path: target, name: path.basename(target) };
});

ipcMain.handle("hostfs:remove", async (_e, { path: p, app: appName }) => {
  const target = await resolveTarget(p);
  await gateDelete(target, appName);
  await fsp.rm(target, { recursive: false });
  return { ok: true };
});

/* ---------------- app lifecycle ---------------- */

app.whenReady().then(() => {
  createWindow();

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      title: "AIndows update",
      message: `AIndows ${info.version} has been dreamed up.`,
      detail: "Restart to wake up in the new version — or keep working; it installs itself when you quit.",
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
