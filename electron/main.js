/* ============ AIndows 11 — desktop shell (Electron) ============
 * Wraps the web OS in a native window and keeps it up to date:
 * electron-updater checks this repo's GitHub Releases on launch and
 * silently downloads new versions (installs on quit, or on demand).
 */

const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    title: "AIndows 11",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.maximize();
  win.loadFile(path.join(__dirname, "..", "index.html"));

  // Real links (like platform.claude.com) open in the real browser,
  // not inside the dream.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Auto-update: checks GitHub Releases. Harmless no-op while offline,
  // unpackaged, or before the first release exists.
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
