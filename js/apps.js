/* ============ AIndows 11 — app registry & built-in apps ============
 * Only three apps are real (Welcome, Notepad, Settings).
 * Every other app is hallucinated by Claude at the moment you open it —
 * and can keep dreaming deeper through the dream() bridge.
 */

const APP_REGISTRY = [
  // ---- real, built-in ----
  { id: "welcome",  name: "Welcome",       icon: "👋", builtin: "welcome",  desktop: true,  w: 580, h: 500 },
  { id: "notepad",  name: "Notepad",       icon: "📝", builtin: "notepad",  desktop: true,  w: 560, h: 420 },
  { id: "settings", name: "Settings",      icon: "⚙️", builtin: "settings", desktop: true,  w: 640, h: 560 },

  // ---- imagined by the AI on open ----
  { id: "explorer",   name: "File Explorer", icon: "📁", desktop: true,  w: 760, h: 520,
    desc: "A real, working Windows 11 File Explorer. On startup call os.drives() and os.userDirs(). IF os.drives() RETURNS DRIVES (real-files mode), BROWSE THE USER'S ACTUAL PC — this is the point, make it genuinely work: left sidebar has Quick access (Desktop, Documents, Downloads, Pictures, Music from os.userDirs() — each navigates via os.listFiles(thatPath)) and This PC (each real drive from os.drives(), showing e.g. 'Local Disk (C:)' with free/total space from freeBytes/totalBytes). The main pane lists the CURRENT folder via os.listFiles(currentPath), showing the real folders and files with their real names, sizes (format bytes → KB/MB/GB) and dates; folders sort first. CRITICAL — classify each item ONLY by its isFolder boolean, never by its name or extension: give a 📁 folder icon and folder behavior ONLY when isFolder is true. Everything with isFolder false is a FILE — including .exe, .lnk, .msi, .zip, .iso — so give it a file/type icon (a document/gear/box emoji, NEVER a folder icon). Double-clicking a FOLDER (isFolder true) navigates into it via os.listFiles(item.path) and updates the view + breadcrumb. Double-clicking a FILE (isFolder false) opens it via os.open(item.path) — which shows a viewer for documents and RUNS executables. Never call os.listFiles on a file. Provide a working breadcrumb path bar (click any segment to jump), Back and Up buttons, and a real-time item count. Show a subtle loading state while a folder lists; if a listing throws (permission), show a small inline 'can't open this folder' message and stay put. Start the view at This PC. IF os.drives() returns [] (real files off / browser), fall back to a delightful dreamed filesystem using dream() for folder contents. Never fabricate real files — always list them." },
  { id: "browser",    name: "Browser",        icon: "🌐", desktop: false, w: 820, h: 560,
    desc: "A web browser onto an imagined internet — address bar, tabs, and a fake news-portal homepage. Every link MUST work: intercept clicks and dream() the next page (pass the invented URL and what the page should be), then render it and update the address bar, with working back/forward history" },
  { id: "calculator", name: "Calculator",     icon: "🧮", desktop: true,  w: 340, h: 500,
    desc: "A fully functional Windows 11 calculator with working arithmetic, keyboard support, and a small history panel" },
  { id: "paint",      name: "Paint",          icon: "🎨", desktop: true,  w: 760, h: 540,
    desc: "A working paint app: canvas you can actually draw on with the mouse, color palette, brush sizes, eraser, clear button" },
  { id: "minesweeper",name: "Minesweeper",    icon: "💣", desktop: true,  w: 480, h: 560,
    desc: "A fully playable Minesweeper: 9x9 grid with 10 mines, left-click reveal, right-click flag, flood fill on empty cells, win/lose detection, restart button, mine counter and timer" },
  { id: "weather",    name: "Weather",        icon: "⛅", desktop: true,  w: 640, h: 480,
    desc: "A Windows 11 weather app with an invented-but-plausible current forecast, hourly strip, 7-day outlook, and a city switcher. When a new city is picked, dream() that city's forecast panel" },
  { id: "music",      name: "Media Player",   icon: "🎵", desktop: false, w: 680, h: 500,
    desc: "A music player library full of songs and albums that were never recorded, with a now-playing bar whose play button animates a fake progress bar. Clicking an album dreams() its full tracklist and liner notes" },
  { id: "photos",     name: "Photos",         icon: "🖼️", desktop: false, w: 720, h: 520,
    desc: "A photo gallery of 'photos' rendered as varied inline SVG / CSS-gradient scenes (sunsets, mountains, city nights) in a grid, with a lightbox view on click and invented dates/filenames" },
  { id: "mail",       name: "Mail",           icon: "✉️", desktop: false, w: 760, h: 520,
    desc: "An email client with folders, an inbox of emails that were never sent (newsletters, a landlord, an old friend, suspicious spam), and a reading pane. Opening an email dreams() its full body; replying and sending dreams() the sender's reply back after a moment. The compose window's attach button lists the user's REAL files via os.listFiles()" },
  { id: "terminal",   name: "Terminal",       icon: "⌨️", desktop: false, w: 680, h: 440,
    desc: "A dark-themed terminal that actually responds to typed commands: help, dir, cd, echo, whoami, ipconfig, cls, and a few joke commands — inventing plausible output for each. For an unknown command, dream() what its output would plausibly be and print it. The dir command also merges the user's REAL files from os.listFiles()" },
  { id: "store",      name: "Store",          icon: "🛍️", desktop: false, w: 760, h: 540,
    desc: "An app store full of apps that don't exist, with ratings, fake reviews, editor's picks, and Install buttons that animate a download then say Installed. Clicking an app dreams() its full store page with screenshots described in CSS/SVG" },
];

/* ---------- built-in app renderers (return a DOM node) ---------- */

const BUILTINS = {

  welcome() {
    const el = document.createElement("div");
    el.className = "app-pane";
    el.innerHTML = `
      <h2>Welcome to AIndows 11</h2>
      <p>This looks like Windows. It isn't. Only three apps on this machine actually
         exist as code — this one, Notepad, and Settings.</p>
      <p><b>Every other app is dreamed into existence by an AI the moment you open it</b> —
         and the dream has no bottom. Folders open. Links go somewhere. Emails get replies.
         Each level deeper is imagined the moment you click it.</p>
      <h3>Getting started</h3>
      <p>1. Open <b>⚙️ Settings</b> and paste a Claude API key
         (get one at <a href="https://platform.claude.com" target="_blank" rel="noreferrer">platform.claude.com</a>).
         The key is stored only in this browser's localStorage and sent only to Anthropic.</p>
      <p>2. Double-click any desktop icon and <b>watch the app being written, live</b>, before it opens.</p>
      <p>3. The real magic: open the <b>Start menu</b>, type any app that should exist —
         <code>Dream Journal</code>, <code>Excuse Generator 3000</code>, <code>Cat Stock Exchange</code> —
         and press <b>Enter</b>. It gets built on the spot and pinned to your desktop.</p>
      <h3>Good to know</h3>
      <p>• <b>🤖 Copilot</b> lives in the taskbar. Ask it to open apps, summon new ones,
         save notes to your disk, or rewrite the universe — it acts, not just talks.</p>
      <p>• <b>Files are real now.</b> Save a drawing in Paint or a note in an editor and it
         lands on the <i>dream disk</i> — it'll be there in File Explorer, in other apps,
         and after a reboot.</p>
      <p>• <b>Open any file in its own app.</b> Double-click a file in Explorer (or ask
         Copilot to open one) and AIndows dreams a viewer/editor tailored to it —
         seeded with the file's real contents.</p>
      <p>• <b>Drag windows to screen edges</b> to snap them — halves at the sides,
         quarters at the corners, top edge to maximize.</p>
      <p>• <b>Reflect your real apps into AIndows.</b> With real files + real apps on, type an
         installed app in Start (Spotify, Steam, VS Code) and click the 🪞 result — AIndows
         dreams that app <i>inside</i> itself, built from the real data it reads off your disk.
         Or ask Copilot ("dream me a Spotify from my real data, use my Music folder too").
         The small "launch ↗" tag opens the actual program instead.</p>
      <p>• <b>Dark mode</b> and a cheaper <b>depth model</b> (for drilling &amp; viewers)
         live in Settings — dark mode themes the dreamed apps too.</p>
      <p>• The tray shows a running <b>≈$ cost estimate</b> so you always know what the
         dreaming costs.</p>
      <p>• <b>Right-click</b> the desktop or any icon for options — re-dream, export, unpin, change wallpaper.</p>
      <p>• <b>💾 Export</b> (title bar or right-click) saves any dreamed app as a standalone
         <code>.html</code> file you can send to friends.</p>
      <p>• Apps share one canon — the same you, the same files, the same city — set in
         Settings under <b>Universe</b>. Change it and re-dream to live a different life.</p>
      <p>• Dreamed apps and every level you drill into are cached, so revisiting is instant
         and free. 🔄 re-dreams from scratch. Fresh dreams cost a few cents each (Opus) or
         less (Haiku).</p>
      <p>• Dreamed code runs in a sandboxed iframe — it can never see your key or your data.</p>`;
    return el;
  },

  notepad() {
    const el = document.createElement("textarea");
    el.className = "notepad-area";
    el.spellcheck = false;
    el.placeholder = "The only text on this computer that a human actually typed…\n(whatever you write here becomes canon — dreamed apps will treat it as ideas.txt)";
    el.value = localStorage.getItem("aindows.notepad") || "";
    el.addEventListener("input", () => localStorage.setItem("aindows.notepad", el.value));
    return el;
  },

  settings() {
    const s = AI.getSettings();
    const el = document.createElement("div");
    el.className = "app-pane";
    el.innerHTML = `
      <h2>Settings</h2>
      <h3>Imagination engine</h3>
      <div class="set-row">
        <label for="set-key">API key</label>
        <input id="set-key" type="password" placeholder="sk-ant-…" autocomplete="off" />
        <button id="set-eye" title="Show/hide" style="border:none;background:none;cursor:pointer">👁️</button>
      </div>
      <div class="set-row">
        <label for="set-model">App model</label>
        <select id="set-model">
          <option value="claude-opus-4-8">Claude Opus 4.8 — best apps (default)</option>
          <option value="claude-fable-5">Claude Fable 5 — deepest dreams (2× Opus price, thinks first)</option>
          <option value="claude-sonnet-5">Claude Sonnet 5 — fast &amp; great</option>
          <option value="claude-haiku-4-5">Claude Haiku 4.5 — fastest &amp; cheapest</option>
        </select>
      </div>
      <div class="set-row">
        <label for="set-depthmodel">Depth model</label>
        <select id="set-depthmodel">
          <option value="">Same as app model</option>
          <option value="claude-haiku-4-5">Claude Haiku 4.5 — cheap &amp; fast (recommended)</option>
          <option value="claude-sonnet-5">Claude Sonnet 5</option>
          <option value="claude-opus-4-8">Claude Opus 4.8</option>
        </select>
      </div>
      <p style="font-size:12px;color:#777;margin:-2px 2px 6px">Used for the cheap stuff — drilling into
         folders/links and opening file viewers. A lighter model here makes exploring nearly free.</p>
      <div class="set-actions">
        <button class="primary" id="set-save">Save</button>
        <button id="set-test">Test connection</button>
        <button id="set-clearcache">Forget all dreams (<span id="set-cachecount">0</span> cached)</button>
      </div>
      <div id="set-status"></div>

      <h3>Universe</h3>
      <p>The shared canon every dreamed app stays consistent with — who you are, what's on
         your disk, the weather outside. Edit it (valid JSON) and re-dream apps to reroll
         your reality.</p>
      <textarea id="set-universe" class="universe-area" spellcheck="false"></textarea>
      <div class="set-actions">
        <button class="primary" id="set-usave">Save universe</button>
        <button id="set-ureset">Reset to default</button>
      </div>
      <div id="set-ustatus"></div>

      <h3>Appearance</h3>
      <div class="set-row">
        <label for="set-dark">Dark mode</label>
        <input id="set-dark" type="checkbox" style="flex:0 0 auto;width:18px;height:18px" />
        <span style="font-size:12px;color:#666">themes the OS chrome and (on re-dream) the apps too</span>
      </div>

      <h3>Real PC files <span id="set-realfs-badge"></span></h3>
      <p>Let AIndows and its dreamed apps read and write the <b>actual files on this
         computer</b>. Only works in the desktop app. <b>Every</b> real read, write, and
         delete asks you to approve it first — and the app code is written by AI, so keep
         that in mind before you allow anything.</p>
      <div class="set-row">
        <label for="set-realfs">Use my real PC files</label>
        <input id="set-realfs" type="checkbox" style="flex:0 0 auto;width:18px;height:18px" />
        <span id="set-realfs-note" style="font-size:12px;color:#666"></span>
      </div>
      <div class="set-row">
        <label for="set-fullaccess">Full disk access <span style="font-weight:400;color:#c42b1c">⚠</span></label>
        <input id="set-fullaccess" type="checkbox" style="flex:0 0 auto;width:18px;height:18px" />
        <span id="set-fullaccess-note" style="font-size:12px;color:#666"></span>
      </div>
      <p style="font-size:12px;color:#c0392b;margin:-2px 2px 6px">With this on, AIndows and its
         AI-written apps read and change <b>any file on your PC without asking</b> — no per-folder
         prompts. Deleting still asks. Only turn this on if you understand that.</p>

      <h3>Launch real apps <span id="set-realapps-badge"></span></h3>
      <p>Let AIndows run <b>real programs on this PC</b>: launch installed apps (type a name
         in Start → 🖥️, or ask Copilot), and <b>open files with their real Windows program</b>
         — so double-clicking a <code>.exe</code>, <code>.pdf</code>, <code>.docx</code>, etc.
         in File Explorer opens it for real. Desktop app only. <b>Every launch/open asks you
         to approve it</b>, and executables re-confirm every time.</p>
      <div class="set-row">
        <label for="set-realapps">Launch my real PC apps</label>
        <input id="set-realapps" type="checkbox" style="flex:0 0 auto;width:18px;height:18px" />
        <span id="set-realapps-note" style="font-size:12px;color:#666"></span>
      </div>

      <h3>Dream disk</h3>
      <p><span id="set-filecount">0</span> file(s) saved to the in-OS dream disk (used when
         real PC files are off). These persist across reboots and appear in file-listing apps.</p>
      <div class="set-actions">
        <button id="set-clearfiles">Delete all dream-disk files</button>
      </div>

      <h3>About</h3>
      <p>Your key lives in this browser's localStorage and is sent only to
         <code>api.anthropic.com</code>. Dreamed apps run sandboxed and cannot read it.</p>`;

    const $ = (q) => el.querySelector(q);
    $("#set-key").value = s.apiKey;
    $("#set-model").value = s.model;
    $("#set-depthmodel").value = s.depthModel || "";
    $("#set-cachecount").textContent = AI.cacheCount();
    $("#set-universe").value = JSON.stringify(AI.getUniverse(), null, 2);
    $("#set-filecount").textContent = FS.count();

    $("#set-clearfiles").addEventListener("click", () => {
      FS.clear();
      $("#set-filecount").textContent = "0";
      status("#set-ustatus", "Dream disk wiped.", true);
    });

    // Dark mode — lives in the universe canon so dreamed apps follow it too.
    const darkBox = $("#set-dark");
    darkBox.checked = AI.getUniverse().theme === "dark";
    darkBox.addEventListener("change", () => {
      AI.saveUniverse(Object.assign(AI.getUniverse(), { theme: darkBox.checked ? "dark" : "light" }));
      document.dispatchEvent(new CustomEvent("aindows:theme"));
      status("#set-ustatus",
        darkBox.checked ? "Dark mode on. Re-dream apps (🔄) to darken them too." : "Back to light mode.",
        true);
    });

    // Real PC files toggle — only meaningful in the desktop app.
    const hostReady = !!(window.hostFS && window.hostFS.available);
    const realBox = $("#set-realfs");
    realBox.checked = localStorage.getItem("aindows.realfs") === "1";
    realBox.disabled = !hostReady;
    $("#set-realfs-badge").textContent = hostReady ? "🖥️ desktop app" : "";
    $("#set-realfs-note").textContent = hostReady
      ? (realBox.checked ? "on — apps can reach your real files (with your approval)" : "off — apps use the dream disk")
      : "Only available in the desktop app (.exe). In the browser, apps always use the dream disk.";
    // Full disk access (no prompts) — a sub-option of real files.
    const fullBox = $("#set-fullaccess");
    const fullNote = () => {
      if (!hostReady) return "Only available in the desktop app (.exe).";
      if (!realBox.checked) return "Turn on real PC files first.";
      return fullBox.checked ? "ON — no prompts (delete still asks)" : "off — you approve each folder";
    };
    const refreshFull = () => { fullBox.disabled = !hostReady || !realBox.checked; $("#set-fullaccess-note").textContent = fullNote(); };
    fullBox.checked = localStorage.getItem("aindows.fullaccess") === "1";
    refreshFull();
    fullBox.addEventListener("change", () => {
      localStorage.setItem("aindows.fullaccess", fullBox.checked ? "1" : "0");
      if (window.hostFS && window.hostFS.setFullAccess) window.hostFS.setFullAccess(fullBox.checked).catch(() => {});
      $("#set-fullaccess-note").textContent = fullNote();
      status("#set-ustatus",
        fullBox.checked
          ? "⚠ Full disk access ON — no more prompts for reads/writes. Any AI-written app can now touch any file."
          : "Full disk access off — per-folder approval is back.",
        true);
    });

    realBox.addEventListener("change", () => {
      localStorage.setItem("aindows.realfs", realBox.checked ? "1" : "0");
      $("#set-realfs-note").textContent = realBox.checked
        ? "on — apps can reach your real files (with your approval)"
        : "off — apps use the dream disk";
      refreshFull();
      status("#set-ustatus",
        realBox.checked
          ? "Real PC files ON. Re-dream file apps (🔄) so they use them, and expect approval prompts."
          : "Real PC files off — back to the dream disk.",
        true);
    });

    // Launch real apps toggle — only meaningful in the desktop app.
    const appsReady = !!(window.hostApps && window.hostApps.available);
    const appsBox = $("#set-realapps");
    appsBox.checked = localStorage.getItem("aindows.realapps") === "1";
    appsBox.disabled = !appsReady;
    $("#set-realapps-badge").textContent = appsReady ? "🖥️ desktop app" : "";
    const appsNote = () => appsReady
      ? (appsBox.checked ? "on — type an app in Start and click the 🖥️ result (you approve each launch)" : "off")
      : "Only available in the desktop app (.exe).";
    $("#set-realapps-note").textContent = appsNote();
    appsBox.addEventListener("change", () => {
      localStorage.setItem("aindows.realapps", appsBox.checked ? "1" : "0");
      $("#set-realapps-note").textContent = appsNote();
      status("#set-ustatus",
        appsBox.checked ? "Real-app launching ON — your installed apps now show in Start search." : "Real-app launching off.",
        true);
    });

    const status = (sel, msg, ok) => {
      const n = $(sel);
      n.textContent = msg;
      n.className = ok === undefined ? "" : ok ? "ok" : "bad";
    };

    $("#set-eye").addEventListener("click", () => {
      const k = $("#set-key");
      k.type = k.type === "password" ? "text" : "password";
    });

    $("#set-save").addEventListener("click", () => {
      AI.saveSettings({ apiKey: $("#set-key").value.trim(), model: $("#set-model").value, depthModel: $("#set-depthmodel").value });
      status("#set-status", "Saved.", true);
    });

    $("#set-test").addEventListener("click", async () => {
      AI.saveSettings({ apiKey: $("#set-key").value.trim(), model: $("#set-model").value, depthModel: $("#set-depthmodel").value });
      if (!AI.hasKey()) return status("#set-status", "Enter a key first.", false);
      status("#set-status", "Testing…");
      try {
        await AI.testKey();
        status("#set-status", "✔ Connected — the imagination engine is online.", true);
      } catch (e) {
        status("#set-status", "✘ " + e.message, false);
      }
    });

    $("#set-clearcache").addEventListener("click", () => {
      AI.clearAllCached();
      $("#set-cachecount").textContent = "0";
      status("#set-status", "All dreams forgotten. Apps will be re-imagined on next open.", true);
    });

    $("#set-usave").addEventListener("click", () => {
      try {
        AI.saveUniverse(JSON.parse($("#set-universe").value));
        status("#set-ustatus", "Universe saved. Re-dream apps (🔄) to see the new reality.", true);
      } catch {
        status("#set-ustatus", "That's not valid JSON — nothing saved.", false);
      }
    });

    $("#set-ureset").addEventListener("click", () => {
      AI.saveUniverse(AI.defaultUniverse());
      $("#set-universe").value = JSON.stringify(AI.defaultUniverse(), null, 2);
      status("#set-ustatus", "Universe reset to default.", true);
    });

    return el;
  },
};
