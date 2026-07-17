/* ============ AIndows 11 — host filesystem bridge (preload) ============
 * Runs only in the desktop app's top window (never in the sandboxed
 * dreamed-app iframes). Exposes a NARROW, promise-based channel to the
 * main process, where every call is gated behind a native confirmation
 * dialog. The renderer — and the AI code it hosts — can request, but the
 * main process (and you, at the dialog) decide.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hostFS", {
  available: true,
  list: (dir, app) => ipcRenderer.invoke("hostfs:list", { dir, app }),
  read: (path, app) => ipcRenderer.invoke("hostfs:read", { path, app }),
  write: (path, content, app) => ipcRenderer.invoke("hostfs:write", { path, content, app }),
  remove: (path, app) => ipcRenderer.invoke("hostfs:remove", { path, app }),
});
