/* ============ AIndows 11 — shell: windows, taskbar, start menu, copilot ============ */

(() => {
  const desktop = document.getElementById("desktop");
  const iconsEl = document.getElementById("icons");
  const windowsEl = document.getElementById("windows");
  const startMenu = document.getElementById("startmenu");
  const startApps = document.getElementById("start-apps");
  const startSearch = document.getElementById("start-search");
  const taskbarApps = document.getElementById("taskbar-apps");
  const TASKBAR_H = 48;

  /* ---------------- custom (summoned) apps ---------------- */

  const SUMMON_ICONS = ["✨", "🔮", "🌙", "🫧", "🪐", "🌈", "🎁", "🧿"];
  let customApps = [];
  try { customApps = JSON.parse(localStorage.getItem("aindows.customApps") || "[]"); } catch {}

  const saveCustomApps = () =>
    localStorage.setItem("aindows.customApps", JSON.stringify(customApps));

  const allApps = () => APP_REGISTRY.concat(customApps);

  function summonApp(name, description) {
    const id = "summon-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let app = allApps().find((a) => a.id === id);
    if (!app) {
      let h = 0;
      for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      app = {
        id, name, icon: SUMMON_ICONS[h % SUMMON_ICONS.length],
        w: 700, h: 500, desktop: true, custom: true,
        desc: description ||
          "An app summoned by name alone — infer what it should be from the name and make it delightful",
      };
      customApps.push(app);
      saveCustomApps();
      renderIcons();
      renderStartApps("");
      toast(`${app.icon} ${name} pinned to the desktop`);
    }
    openApp(app);
    return app;
  }

  function unpinApp(app) {
    customApps = customApps.filter((a) => a.id !== app.id);
    saveCustomApps();
    AI.clearCached(app.name);
    renderIcons();
    renderStartApps("");
    toast(`${app.name} unpinned and forgotten`);
  }

  /* ---------------- window manager ---------------- */

  const openWindows = new Map(); // appId -> {app, el, tbBtn, dreams}
  let zTop = 100;
  let cascade = 0;

  function focusWindow(rec) {
    for (const r of openWindows.values()) {
      r.el.classList.remove("focused");
      r.tbBtn.classList.remove("active");
    }
    rec.el.classList.remove("minimized");
    rec.el.classList.add("focused");
    rec.tbBtn.classList.add("active");
    rec.el.style.zIndex = ++zTop;
  }

  function closeWindow(rec) {
    rec.el.classList.add("closing");
    setTimeout(() => {
      rec.el.remove();
      rec.tbBtn.remove();
      openWindows.delete(rec.app.id);
    }, 140);
  }

  function createWindow(app) {
    const el = document.createElement("div");
    el.className = "window";
    const w = Math.min(app.w || 640, innerWidth - 40);
    const h = Math.min(app.h || 460, innerHeight - 100);
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.left = Math.max(10, (innerWidth - w) / 2 + (cascade % 6) * 28) + "px";
    el.style.top = Math.max(6, (innerHeight - TASKBAR_H - h) / 2 + (cascade % 6) * 22 - 20) + "px";
    cascade++;

    const isAI = !app.builtin;
    el.innerHTML = `
      <div class="titlebar">
        <span class="t-ico">${app.icon}</span>
        <span class="t-title">${escapeHTML(app.name)}</span>
        <div class="t-btns">
          ${isAI ? `<button class="t-export" title="Export as a standalone .html">&#x1F4BE;</button>
                    <button class="t-regen" title="Re-dream this app">&#x1F504;</button>` : ""}
          <button class="t-min" title="Minimize">&#x2013;</button>
          <button class="t-max" title="Maximize">&#x25A1;</button>
          <button class="t-close" title="Close">&#x2715;</button>
        </div>
      </div>
      <div class="win-body"></div>`;

    windowsEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add("shown"));

    // taskbar button
    const tbBtn = document.createElement("button");
    tbBtn.className = "tb-app";
    tbBtn.textContent = app.icon;
    tbBtn.title = app.name;
    taskbarApps.appendChild(tbBtn);

    const rec = { app, el, tbBtn, dreams: 0 };
    openWindows.set(app.id, rec);

    /* titlebar buttons */
    el.querySelector(".t-close").addEventListener("click", () => closeWindow(rec));
    el.querySelector(".t-min").addEventListener("click", () => {
      el.classList.add("minimized");
      tbBtn.classList.remove("active");
    });
    el.querySelector(".t-max").addEventListener("click", () => el.classList.toggle("maximized"));
    const regen = el.querySelector(".t-regen");
    if (regen) regen.addEventListener("click", () => {
      AI.clearCached(cacheNameOf(app));
      runAIApp(rec, true);
    });
    const exp = el.querySelector(".t-export");
    if (exp) exp.addEventListener("click", () => exportApp(app));

    tbBtn.addEventListener("click", () => {
      if (el.classList.contains("minimized")) focusWindow(rec);
      else if (el.classList.contains("focused")) {
        el.classList.add("minimized");
        tbBtn.classList.remove("active");
      } else focusWindow(rec);
    });

    el.addEventListener("pointerdown", () => focusWindow(rec));

    /* dragging via titlebar — with snap layouts */
    const titlebar = el.querySelector(".titlebar");
    titlebar.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || el.classList.contains("maximized")) return;
      const startX = e.clientX, startY = e.clientY;
      const origX = el.offsetLeft, origY = el.offsetTop;
      let zone = null;
      el.classList.add("dragging");
      const move = (ev) => {
        el.style.left = origX + (ev.clientX - startX) + "px";
        el.style.top = Math.max(0, origY + (ev.clientY - startY)) + "px";
        zone = snapZoneAt(ev.clientX, ev.clientY);
        showSnapPreview(zone);
      };
      const up = () => {
        el.classList.remove("dragging");
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        showSnapPreview(null);
        if (zone) applySnap(el, zone);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    });
    titlebar.addEventListener("dblclick", (e) => {
      if (!e.target.closest("button")) el.classList.toggle("maximized");
    });

    focusWindow(rec);
    return rec;
  }

  /* ---------------- snap layouts ---------------- */

  const snapPreviewEl = document.getElementById("snap-preview");

  function snapZoneAt(x, y) {
    const M = 14, C = 160;
    const H = innerHeight - TASKBAR_H;
    if (y < M) return "top";
    if (x < M) return y < C ? "tl" : y > H - C ? "bl" : "left";
    if (x > innerWidth - M) return y < C ? "tr" : y > H - C ? "br" : "right";
    return null;
  }

  function snapRect(zone) {
    const W = innerWidth, H = innerHeight - TASKBAR_H;
    const half = { w: W / 2, h: H / 2 };
    return {
      top:   { x: 0, y: 0, w: W, h: H },
      left:  { x: 0, y: 0, w: half.w, h: H },
      right: { x: half.w, y: 0, w: half.w, h: H },
      tl:    { x: 0, y: 0, w: half.w, h: half.h },
      tr:    { x: half.w, y: 0, w: half.w, h: half.h },
      bl:    { x: 0, y: half.h, w: half.w, h: half.h },
      br:    { x: half.w, y: half.h, w: half.w, h: half.h },
    }[zone];
  }

  function showSnapPreview(zone) {
    if (!zone) return snapPreviewEl.classList.add("hidden");
    const r = snapRect(zone);
    Object.assign(snapPreviewEl.style, {
      left: r.x + 4 + "px", top: r.y + 4 + "px",
      width: r.w - 8 + "px", height: r.h - 8 + "px",
    });
    snapPreviewEl.classList.remove("hidden");
  }

  function applySnap(el, zone) {
    el.classList.remove("maximized");
    if (zone === "top") return void el.classList.add("maximized");
    const r = snapRect(zone);
    el.style.left = r.x + "px";
    el.style.top = r.y + "px";
    el.style.width = r.w + "px";
    el.style.height = r.h + "px";
  }

  /* ---------------- opening apps ---------------- */

  function openApp(app) {
    hideStartMenu();
    const existing = openWindows.get(app.id);
    if (existing) return focusWindow(existing);

    const rec = createWindow(app);
    if (app.builtin) {
      rec.el.querySelector(".win-body").appendChild(BUILTINS[app.builtin]());
    } else {
      runAIApp(rec, false);
    }
  }

  /* AI app lifecycle: cache -> streaming code view -> iframe (or error) */
  async function runAIApp(rec, forceRegen) {
    const body = rec.el.querySelector(".win-body");
    const { app } = rec;

    const cacheName = cacheNameOf(app);
    if (!forceRegen) {
      const cached = AI.getCached(cacheName);
      if (cached) return mountApp(rec, cached);
    }

    if (!AI.hasKey()) return showNoKey(body, rec);

    body.innerHTML = `
      <div class="ai-loading">
        <div class="ai-load-head">
          <div class="orb"></div>
          <div>
            <div class="ai-title">Dreaming up ${escapeHTML(app.name)}…</div>
            <div class="ai-status">contacting the imagination engine</div>
          </div>
        </div>
        <pre class="ai-code"></pre>
        <div class="ai-note">You are watching this app being written from nothing, live.</div>
      </div>`;
    const statusEl = body.querySelector(".ai-status");
    const codeEl = body.querySelector(".ai-code");

    try {
      const html = await AI.generateApp(cacheName, app.desc || "", (chars, text, phase) => {
        statusEl.textContent = phase === "thinking" && !chars
          ? "the engine is thinking about what this app should be…"
          : `${(chars / 1000).toFixed(1)}k characters materialized`;
        codeEl.textContent = text.slice(-4000);
        codeEl.scrollTop = codeEl.scrollHeight;
      }, app.genModel);
      mountApp(rec, html);
    } catch (err) {
      if (err.message === "NO_KEY") return showNoKey(body, rec);
      body.innerHTML = `
        <div class="ai-error">
          <div class="e-ico">😵</div>
          <div class="e-title">The dream collapsed</div>
          <div class="e-msg">${escapeHTML(err.message)}</div>
          <button class="e-retry">Try again</button>
        </div>`;
      body.querySelector(".e-retry").addEventListener("click", () => runAIApp(rec, forceRegen));
    }
  }

  /* ---------------- the os bridge: dream() + the filesystem ---------------- */

  // Injected into every dreamed app: dream(prompt) and the os.* filesystem API,
  // all riding one postMessage RPC channel.
  const BRIDGE_JS = `<script>
    window.__rpc = (method, args) => new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const onMsg = (e) => {
        const d = e.data;
        if (!d || d.type !== "os:result" || d.id !== id) return;
        removeEventListener("message", onMsg);
        d.error ? reject(new Error(d.error)) : resolve(d.result);
      };
      addEventListener("message", onMsg);
      parent.postMessage({ type: "os", id, method, args }, "*");
    });
    window.dream = (prompt) => __rpc("dream", { prompt: String(prompt) });
    window.os = {
      listFiles:  (dir)                   => __rpc("fs.list",   { dir }),
      readFile:   (path)                  => __rpc("fs.read",   { path }),
      saveFile:   (path, content, folder) => __rpc("fs.write",  { path, content, folder }),
      deleteFile: (path)                  => __rpc("fs.remove", { path }),
      open:       (path)                  => __rpc("open",      { path }),
    };
  </script>`;

  function injectScript(html, scriptTag) {
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + scriptTag);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + scriptTag + "</head>");
    return scriptTag + html;
  }

  function mountApp(rec, html) {
    const body = rec.el.querySelector(".win-body");
    body.innerHTML = "";
    const frame = document.createElement("iframe");
    // no allow-same-origin: dreamed code can never touch your key or storage
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals");
    let injected = injectScript(html, BRIDGE_JS);
    // Viewer windows: tell the app which single file it's dedicated to.
    if (rec.app.openFile) {
      const json = JSON.stringify(rec.app.openFile).replace(/</g, "\\u003c");
      injected = injectScript(injected, `<script>window.OPEN_FILE=${json};</script>`);
    }
    frame.srcdoc = injected;
    body.appendChild(frame);
  }

  // file-type → viewer identity (cached once per kind, so every .txt shares one editor)
  const VIEWERS = {
    text:  { icon: "📄", desc: "A single-file text/code editor (see window.OPEN_FILE)." },
    image: { icon: "🖼️", desc: "A single-image viewer (see window.OPEN_FILE)." },
    data:  { icon: "📊", desc: "A single-file data viewer that renders CSV/JSON as a table (see window.OPEN_FILE)." },
    webpage: { icon: "🌐", desc: "A viewer that renders a single saved HTML/markup file (see window.OPEN_FILE)." },
    audio: { icon: "🎵", desc: "An info panel for a single audio file (see window.OPEN_FILE)." },
    file:  { icon: "📄", desc: "A viewer/editor for a single file (see window.OPEN_FILE)." },
  };
  const EXT_KIND = {
    txt: "text", md: "text", log: "text", js: "text", ts: "text", css: "text", py: "text",
    json: "data", csv: "data", tsv: "data",
    html: "webpage", htm: "webpage", xml: "webpage",
    png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image", svg: "image",
    mp3: "audio", wav: "audio", ogg: "audio",
  };
  const kindOf = (s) => EXT_KIND[(String(s).split(".").pop() || "").toLowerCase()] || "text";
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // Open a file in its own dreamed viewer/editor window.
  function openDreamedFile(pathOrName) {
    pathOrName = String(pathOrName || "").trim();
    if (!pathOrName) return "no file given";
    const kind = kindOf(pathOrName);
    const v = VIEWERS[kind] || VIEWERS.file;
    const base = pathOrName.split(/[\\/]/).pop() || pathOrName;
    openApp({
      id: "viewer-" + kind + "-" + hashStr(pathOrName),
      name: base,
      icon: v.icon,
      w: kind === "image" ? 720 : 680,
      h: 540,
      cacheKey: "viewer-" + kind,     // one cached viewer per file type
      genModel: AI.depthModel(),      // viewers are cheap → depth model
      openFile: { name: base, path: pathOrName, kind },
      desc: v.desc,
    });
    return "opened " + base;
  }

  // What to cache a window's generated HTML under (viewers share by kind).
  const cacheNameOf = (app) => app.cacheKey || app.name;

  // Real-files mode: only in the desktop app, only when the user opted in.
  const hostFSReady = () => !!(window.hostFS && window.hostFS.available);
  const realFilesOn = () => localStorage.getItem("aindows.realfs") === "1" && hostFSReady();

  // Route filesystem ops to the real disk (gated) or the dream disk.
  async function hostList(dir, appName) {
    return realFilesOn() ? window.hostFS.list(dir, appName) : FS.list();
  }
  async function hostRead(id, appName) {
    return realFilesOn() ? window.hostFS.read(String(id), appName) : FS.read(String(id));
  }
  async function hostWrite(id, content, folder, appName) {
    if (realFilesOn()) {
      const r = await window.hostFS.write(String(id), content, appName);
      toast(`💾 ${r.name || id} saved to your PC`);
      return r;
    }
    const r = FS.write(id, content, folder);
    toast(`💾 ${id} saved to the dream disk`);
    return r;
  }
  async function hostRemove(id, appName) {
    return realFilesOn() ? window.hostFS.remove(String(id), appName) : FS.remove(String(id));
  }

  // Shell side: answer os RPCs coming from sandboxed app iframes.
  addEventListener("message", async (e) => {
    const d = e.data;
    if (!d || d.type !== "os" || !d.id || typeof d.method !== "string") return;

    // Only answer iframes that belong to our own windows.
    const rec = [...openWindows.values()].find((r) => {
      const f = r.el.querySelector("iframe");
      return f && f.contentWindow === e.source;
    });
    if (!rec) return;

    const reply = (result, error) => {
      try { e.source.postMessage({ type: "os:result", id: d.id, result, error }, "*"); } catch {}
    };
    const args = d.args || {};

    try {
      switch (d.method) {
        case "dream": {
          if (rec.dreams >= 3)
            return reply(null, "Too many simultaneous dreams — try again in a moment.");
          rec.dreams++;
          rec.el.classList.add("deep-dreaming");
          try {
            reply(await AI.generateFragment(rec.app.name, String(args.prompt || "")));
          } finally {
            rec.dreams--;
            if (rec.dreams === 0) rec.el.classList.remove("deep-dreaming");
          }
          break;
        }
        case "fs.list":   reply(await hostList(args.dir, rec.app.name)); break;
        case "fs.read":   reply(await hostRead(args.path ?? args.name, rec.app.name)); break;
        case "fs.write":  reply(await hostWrite(args.path ?? args.name, args.content, args.folder, rec.app.name)); break;
        case "fs.remove": reply(await hostRemove(args.path ?? args.name, rec.app.name)); break;
        case "open":      reply(openDreamedFile(args.path ?? args.name)); break;
        default:          reply(null, `unknown os method: ${d.method}`);
      }
    } catch (err) {
      reply(null, err.message === "NO_KEY"
        ? "The imagination engine is asleep (no API key)."
        : String(err.message || err));
    }
  });

  /* ---------------- export a dreamed app ---------------- */

  const EXPORT_STUB = `<script>
    const gone = () => Promise.reject(new Error("This app was exported from AIndows 11 — the OS bridge only works inside the OS."));
    window.dream = gone;
    window.os = { listFiles: () => Promise.resolve([]), readFile: gone, saveFile: gone, deleteFile: gone };
  </script>`;

  function exportApp(app) {
    const html = AI.getCached(cacheNameOf(app));
    if (!html) return toast("Nothing to export yet — let it finish dreaming first");
    const blob = new Blob([injectScript(html, EXPORT_STUB)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = app.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("💾 Exported — send it to someone");
  }

  /* ---------------- error / no-key states ---------------- */

  function showNoKey(body, rec) {
    body.innerHTML = `
      <div class="ai-error">
        <div class="e-ico">💤</div>
        <div class="e-title">The imagination engine is asleep</div>
        <div class="e-msg">This app doesn't exist — AIndows dreams its apps into being with Claude.
          Add an API key in Settings to wake the engine, then open this again.</div>
        <button class="e-open-settings">Open Settings</button>
      </div>`;
    body.querySelector(".e-open-settings").addEventListener("click", () => {
      openApp(APP_REGISTRY.find((a) => a.id === "settings"));
    });
  }

  const escapeHTML = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- toast ---------------- */

  let toastTimer = null;
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------------- Copilot ---------------- */

  const cpPanel = document.getElementById("copilot");
  const cpMsgs = document.getElementById("cp-msgs");
  const cpInput = document.getElementById("cp-input");
  let cpHistory = [];
  let cpBusy = false;

  function cpAdd(kind, text) {
    const div = document.createElement("div");
    div.className = "cp-msg cp-" + kind;
    div.textContent = text;
    cpMsgs.appendChild(div);
    cpMsgs.scrollTop = cpMsgs.scrollHeight;
    return div;
  }

  const CP_TOOL_LABELS = {
    os_state: () => "🔍 looking around the OS…",
    open_app: (i) => `🔧 opening ${i.name}…`,
    summon_app: (i) => `✨ summoning ${i.name}…`,
    close_app: (i) => `🔧 closing ${i.name}…`,
    change_wallpaper: () => "🖼️ changing the wallpaper…",
    edit_universe: () => "🌌 rewriting the universe…",
    save_file: (i) => `💾 saving ${i.name}…`,
    delete_file: (i) => `🗑️ deleting ${i.path || i.name}…`,
    list_files: () => "📂 checking your files…",
    read_file: (i) => `📖 reading ${i.path || i.name}…`,
    open_file: (i) => `📄 opening ${i.path || i.name}…`,
  };

  async function cpExecute(name, input) {
    switch (name) {
      case "os_state":
        return {
          openWindows: [...openWindows.values()].map((r) => r.app.name),
          apps: allApps().map((a) => a.name),
          universe: AI.getUniverse(),
          realFilesMode: realFilesOn(),
          files: realFilesOn() ? await hostList(undefined, "Copilot").catch(() => FS.list()) : FS.list(),
          model: AI.getSettings().model,
          depthModel: AI.depthModel(),
          spendUSD: AI.getSpend(),
        };
      case "open_app": {
        const q = String(input.name || "").toLowerCase();
        const app = allApps().find((a) => a.name.toLowerCase() === q)
          || allApps().find((a) => a.name.toLowerCase().includes(q));
        if (!app) return `No app called "${input.name}" exists yet — summon_app can create it.`;
        openApp(app);
        return `opened ${app.name}`;
      }
      case "summon_app": {
        const app = summonApp(String(input.name), input.description);
        return `summoned & pinned ${app.name}`;
      }
      case "close_app": {
        const q = String(input.name || "").toLowerCase();
        const rec = [...openWindows.values()].find((r) => r.app.name.toLowerCase().includes(q));
        if (!rec) return `"${input.name}" isn't open.`;
        closeWindow(rec);
        return `closed ${rec.app.name}`;
      }
      case "change_wallpaper":
        nextWallpaper();
        return "wallpaper changed";
      case "edit_universe": {
        if (!input.merge || typeof input.merge !== "object") throw new Error("merge must be an object");
        AI.saveUniverse(Object.assign(AI.getUniverse(), input.merge));
        return "universe updated — re-dreamed apps will follow the new canon";
      }
      case "list_files":
        return hostList(input.dir, "Copilot");
      case "read_file":
        return hostRead(input.path ?? input.name, "Copilot");
      case "open_file":
        return openDreamedFile(input.path ?? input.name);
      case "save_file":
        return hostWrite(input.name ?? input.path, input.content, input.folder, "Copilot");
      case "delete_file":
        return hostRemove(input.path ?? input.name, "Copilot");
      default:
        throw new Error("unknown tool: " + name);
    }
  }

  // Keep the Copilot's re-sent history bounded so long chats don't re-bill the
  // whole transcript each turn. Trim from the front, but only to a clean user
  // text turn (never mid tool_use/tool_result pair, which the API would reject).
  function trimHistory(msgs) {
    const MAX = 40;
    if (msgs.length <= MAX) return msgs;
    let start = msgs.length - 30;
    while (start > 0 && !(msgs[start].role === "user" && typeof msgs[start].content === "string")) start--;
    return msgs.slice(start);
  }

  async function cpSend(text) {
    if (cpBusy) return;
    cpAdd("user", text);
    if (!AI.hasKey()) {
      cpAdd("bot", "I'm asleep until you add an API key in Settings 💤");
      return;
    }
    cpBusy = true;
    cpHistory.push({ role: "user", content: text });
    const thinking = cpAdd("tool", "…");
    try {
      const { text: reply, messages } = await AI.copilotTurn(
        cpHistory,
        cpExecute,
        (name, input) => { thinking.remove(); cpAdd("tool", (CP_TOOL_LABELS[name] || (() => `🔧 ${name}…`))(input || {})); }
      );
      thinking.remove();
      cpHistory = trimHistory(messages);
      cpAdd("bot", reply);
    } catch (err) {
      thinking.remove();
      cpAdd("bot", "😵 " + err.message);
      cpHistory.pop(); // forget the failed turn so retry is clean
    } finally {
      cpBusy = false;
    }
  }

  document.getElementById("copilot-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    cpPanel.classList.toggle("hidden");
    if (!cpPanel.classList.contains("hidden")) {
      if (!cpMsgs.children.length)
        cpAdd("bot", "Hey! I live in your taskbar. Ask me to open apps, summon new ones, save notes, change the wallpaper, or rewrite reality (Settings → Universe kind of reality).");
      cpInput.focus();
    }
  });
  document.getElementById("cp-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = cpInput.value.trim();
    if (!text) return;
    cpInput.value = "";
    cpSend(text);
  });
  document.getElementById("cp-clear").addEventListener("click", () => {
    cpHistory = [];
    cpMsgs.innerHTML = "";
    cpAdd("bot", "Fresh start. What are we doing?");
  });

  /* ---------------- context menus ---------------- */

  let menuEl = null;
  function showMenu(items, x, y) {
    hideMenu();
    menuEl = document.createElement("div");
    menuEl.id = "ctxmenu";
    for (const it of items) {
      const row = document.createElement("div");
      row.className = "ctx-item";
      row.textContent = it.label;
      row.addEventListener("click", () => { hideMenu(); it.action(); });
      menuEl.appendChild(row);
    }
    document.body.appendChild(menuEl);
    const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    menuEl.style.left = Math.min(x, innerWidth - mw - 8) + "px";
    menuEl.style.top = Math.min(y, innerHeight - mh - 8) + "px";
  }
  function hideMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; }
  }
  addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#ctxmenu")) hideMenu();
  });

  desktop.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".window")) return; // windows keep native behavior
    e.preventDefault();
    const iconEl = e.target.closest(".dicon");
    if (iconEl) {
      const app = allApps().find((a) => a.id === iconEl.dataset.appId);
      if (!app) return;
      const items = [{ label: "Open", action: () => openApp(app) }];
      if (!app.builtin) {
        items.push({ label: "🔄 Re-dream", action: () => {
          AI.clearCached(cacheNameOf(app));
          const rec = openWindows.get(app.id);
          if (rec) runAIApp(rec, true); else openApp(app);
        }});
        items.push({ label: "💾 Export as .html", action: () => exportApp(app) });
      }
      if (app.custom) items.push({ label: "📌 Unpin from desktop", action: () => unpinApp(app) });
      showMenu(items, e.clientX, e.clientY);
    } else {
      showMenu([
        { label: "✨ Summon an app…", action: () => { toggleStartMenu(true); } },
        { label: "🤖 Ask Copilot", action: () => document.getElementById("copilot-btn").click() },
        { label: "🖼️ Change wallpaper", action: nextWallpaper },
        { label: "👋 About AIndows", action: () => openApp(APP_REGISTRY.find((a) => a.id === "welcome")) },
      ], e.clientX, e.clientY);
    }
  });

  /* ---------------- wallpapers ---------------- */

  const WALLS = ["", "wall-1", "wall-2"];
  let wallIdx = parseInt(localStorage.getItem("aindows.wallpaper") || "0", 10) % WALLS.length;
  function applyWallpaper() {
    desktop.classList.remove("wall-1", "wall-2");
    if (WALLS[wallIdx]) desktop.classList.add(WALLS[wallIdx]);
  }
  function nextWallpaper() {
    wallIdx = (wallIdx + 1) % WALLS.length;
    localStorage.setItem("aindows.wallpaper", String(wallIdx));
    applyWallpaper();
  }
  applyWallpaper();

  /* ---------------- theme (light / dark, canon-deep) ---------------- */

  function applyTheme() {
    document.body.classList.toggle("dark", AI.getUniverse().theme === "dark");
  }
  document.addEventListener("aindows:theme", applyTheme);
  applyTheme();

  /* ---------------- desktop icons ---------------- */

  function renderIcons() {
    iconsEl.innerHTML = "";
    for (const app of allApps().filter((a) => a.desktop)) {
      const d = document.createElement("div");
      d.className = "dicon";
      d.dataset.appId = app.id;
      d.innerHTML = `
        <div class="ico">${app.icon}</div>
        <div class="label">${escapeHTML(app.name)}</div>
        ${app.builtin ? "" : `<div class="ai-badge">✨ dreamed</div>`}`;
      d.addEventListener("click", () => {
        document.querySelectorAll(".dicon.selected").forEach((n) => n.classList.remove("selected"));
        d.classList.add("selected");
      });
      d.addEventListener("dblclick", () => openApp(app));
      iconsEl.appendChild(d);
    }
  }
  desktop.addEventListener("click", (e) => {
    if (e.target === desktop || e.target === iconsEl)
      document.querySelectorAll(".dicon.selected").forEach((n) => n.classList.remove("selected"));
  });

  /* ---------------- start menu ---------------- */

  function renderStartApps(filter) {
    startApps.innerHTML = "";
    const f = (filter || "").toLowerCase();
    for (const app of allApps().filter((a) => !f || a.name.toLowerCase().includes(f))) {
      const b = document.createElement("div");
      b.className = "s-app";
      b.innerHTML = `<div class="ico">${app.icon}</div><div class="label">${escapeHTML(app.name)}</div>`;
      b.addEventListener("click", () => openApp(app));
      startApps.appendChild(b);
    }
  }

  function toggleStartMenu(forceOpen) {
    if (startMenu.classList.contains("hidden") || forceOpen) {
      startMenu.classList.remove("hidden");
      startSearch.value = "";
      renderStartApps("");
      startSearch.focus();
    } else hideStartMenu();
  }
  function hideStartMenu() {
    startMenu.classList.add("hidden");
  }

  document.getElementById("start-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleStartMenu();
  });
  startMenu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#startmenu") && !e.target.closest("#start-btn")) hideStartMenu();
  });

  startSearch.addEventListener("input", () => renderStartApps(startSearch.value));
  startSearch.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = startSearch.value.trim();
    if (!q) return;
    const match = allApps().find((a) => a.name.toLowerCase() === q.toLowerCase())
      || allApps().find((a) => a.name.toLowerCase().startsWith(q.toLowerCase()));
    if (match) return openApp(match);
    // No such app? There is now. Summon it (and pin it to the desktop).
    hideStartMenu();
    summonApp(q);
  });

  document.getElementById("power-btn").addEventListener("click", () => location.reload());

  /* ---------------- tray: clock + AI status + spend ---------------- */

  function tickClock() {
    const now = new Date();
    document.getElementById("clock-time").textContent =
      now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    document.getElementById("clock-date").textContent = now.toLocaleDateString();
  }
  setInterval(tickClock, 1000);
  tickClock();

  function refreshAIStatus() {
    const dot = document.getElementById("ai-status");
    const on = AI.hasKey();
    dot.classList.toggle("on", on);
    dot.title = on
      ? `Imagination engine online (${AI.getSettings().model})`
      : "Imagination engine offline — add an API key in Settings";
  }
  document.addEventListener("aindows:settings", refreshAIStatus);
  refreshAIStatus();

  document.addEventListener("aindows:spend", (e) => {
    const el = document.getElementById("spend");
    const s = e.detail.session;
    el.textContent = "≈$" + s.toFixed(s < 0.1 ? 3 : 2);
    el.title =
      `Estimated API spend\n` +
      `This session: $${e.detail.session.toFixed(4)}\n` +
      `All time: $${e.detail.lifetime.toFixed(4)}\n` +
      `Last dream: $${e.detail.last.toFixed(4)}`;
  });

  /* ---------------- startup chime ---------------- */

  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = () => {
        [329.63, 493.88, 659.25, 587.33].forEach((freq, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          const t0 = ctx.currentTime + i * 0.16;
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.10, t0 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
          o.connect(g).connect(ctx.destination);
          o.start(t0);
          o.stop(t0 + 1.3);
        });
      };
      if (ctx.state === "suspended") {
        // Browsers block audio before the first interaction — chime then instead.
        addEventListener("pointerdown", () => ctx.resume().then(play), { once: true });
      } else play();
    } catch { /* no audio — no problem */ }
  }

  /* ---------------- boot ---------------- */

  renderIcons();
  renderStartApps("");

  setTimeout(() => {
    document.getElementById("boot").classList.add("fade");
    chime();
    // First run (or no key yet): explain what this thing is.
    if (!AI.hasKey() || !localStorage.getItem("aindows.booted")) {
      openApp(APP_REGISTRY.find((a) => a.id === "welcome"));
      localStorage.setItem("aindows.booted", "1");
    }
  }, 1900);
})();
