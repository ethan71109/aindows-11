/* ============ AIndows 11 — the dream disk ============
 * A tiny persistent virtual filesystem (localStorage-backed).
 * Dreamed apps reach it through the os.* bridge; the Copilot and
 * Settings touch it directly. Files here are REAL: they survive
 * reboots and appear across every app that lists files.
 */

const FS = (() => {
  const KEY = "aindows.fs";
  const MAX_FILE = 200 * 1024;      // 200 KB per file
  const MAX_TOTAL = 2 * 1024 * 1024; // 2 MB dream disk

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function persist(files) {
    localStorage.setItem(KEY, JSON.stringify(files));
    document.dispatchEvent(new CustomEvent("aindows:fs"));
  }

  function guessKind(name) {
    const ext = (name.split(".").pop() || "").toLowerCase();
    return ({
      txt: "text", md: "text", png: "image", jpg: "image", svg: "image",
      html: "webpage", json: "data", csv: "data", mp3: "audio",
    })[ext] || "file";
  }

  function list() {
    return load().map((f) => ({
      name: f.name, folder: f.folder, kind: f.kind,
      size: (f.content || "").length, modified: f.modified,
    }));
  }

  function read(name) {
    const f = load().find((f) => f.name === name);
    if (!f) throw new Error(`no such file: ${name}`);
    return f.content;
  }

  function write(name, content, folder, kind) {
    name = String(name || "").trim().slice(0, 120);
    if (!name) throw new Error("a file needs a name");
    content = String(content ?? "");
    if (content.length > MAX_FILE) throw new Error("file too large (200 KB max)");

    const files = load();
    const total = files.reduce((s, f) => s + (f.content || "").length, 0);
    if (total + content.length > MAX_TOTAL)
      throw new Error("the dream disk is full — delete some files first");

    const now = new Date().toISOString();
    const existing = files.find((f) => f.name === name);
    if (existing) {
      Object.assign(existing, {
        content,
        folder: folder || existing.folder,
        kind: kind || existing.kind,
        modified: now,
      });
    } else {
      files.push({
        name,
        folder: folder || "Documents",
        kind: kind || guessKind(name),
        content, created: now, modified: now,
      });
    }
    persist(files);
    return { ok: true, name };
  }

  function remove(name) {
    const files = load();
    const i = files.findIndex((f) => f.name === name);
    if (i < 0) throw new Error(`no such file: ${name}`);
    files.splice(i, 1);
    persist(files);
    return { ok: true };
  }

  const count = () => load().length;
  const clear = () => persist([]);

  return { list, read, write, remove, count, clear };
})();
