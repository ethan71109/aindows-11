/* ============ AIndows 11 — imagination engine ============
 * Talks to the Claude API directly from the browser:
 *   - generateApp / generateFragment: dream apps + deeper content
 *   - copilotTurn: the taskbar assistant's tool-use agent loop
 *   - recordUsage: the cost meter's bookkeeping
 */

const AI = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";
  const MODELS_URL = "https://api.anthropic.com/v1/models";
  const SETTINGS_KEY = "aindows.settings";
  const UNIVERSE_KEY = "aindows.universe";
  const CACHE_PREFIX = "aindows.appcache.";

  /* ---------- prompts ---------- */

  const SYSTEM_APP = `You are the app-materialization engine inside AIndows 11, an operating system whose applications are dreamed into existence the moment a user opens them.

When given an app name, output ONE complete, self-contained HTML document that IS that application, fully working.

Hard rules:
- Output ONLY the HTML document. No markdown fences, no commentary before or after. Start with <!DOCTYPE html>.
- Fully self-contained: all CSS in a <style> tag, all JS in a <script> tag. NO external URLs of any kind (no CDNs, fonts, images, fetch/XHR) — the sandbox blocks them all. Use emoji, unicode symbols, CSS shapes, or inline SVG for graphics.
- Visual style: native Windows 11 app. font-family "Segoe UI", accent color #0067c0, rounded corners (4-8px), comfortable padding. The document fills the window: html,body{height:100%;margin:0}. THEME: if the WORLD STATE below has theme:"dark", use a dark Windows 11 look (#202020 / #2b2b2b surfaces, #e6e6e6 text, #3a3a3a borders, accent #4cc2ff); otherwise a light look (#f9f9f9 / #ffffff surfaces, #1a1a1a text, 1px borders rgba(0,0,0,.08)).
- Make it genuinely interactive and functional wherever possible with plain JavaScript: calculators calculate, games are playable, editors edit, tabs switch, buttons respond. State can live in JS variables (localStorage is unavailable in the sandbox).
- Fill it with rich, specific, plausible fake content. Be imaginative and detailed; never use placeholder text like "Item 1" or "Lorem ipsum".
- Never mention that you are an AI or that the content is generated. The app simply exists.
- Keep the total under ~700 lines so it streams quickly.

INFINITE DEPTH — the dream() bridge:
The sandbox provides a global async function dream(prompt) -> Promise<string> that resolves to a NEW imagined HTML fragment. Use it so the app has no dead ends: when the user drills into something that would need more content — opening a folder, an email, an article, a link, a song's album page, a product listing — call dream() and insert the result with container.innerHTML.
- The prompt you pass must be fully self-describing: say what the app is, what was clicked, and the EXACT HTML structure and class names the fragment must use to match your existing layout.
- Show a small inline loading state while awaiting; wrap in try/catch and show a graceful inline error on failure.
- Fragments are static HTML/CSS (their <script> tags will not run), so attach interactivity via event delegation on a parent container you own — e.g. one click listener that checks e.target and calls dream() again for the next level.
- Do NOT call dream() during initial load; the app must arrive complete. Use it only in response to user actions.

THE OS FILESYSTEM — real, persistent user files:
The sandbox also provides a global "os" object:
  os.listFiles(dir?) -> Promise<[{name, path, folder, isFolder, kind, size, modified}]> — use the isFolder boolean to tell folders from files; NEVER guess folder-ness from the name. Only call os.listFiles on items where isFolder is true.
  os.readFile(path) -> Promise<string>
  os.saveFile(path, content, folder?) -> Promise<{ok}>
  os.deleteFile(path) -> Promise<{ok}>
  os.open(path) -> opens a file the right way: text/code/data/image files open in a dreamed viewer/editor; an application's executable (.exe/.lnk/.msi) DREAMS that app into AIndows from its real data; other files (pdf, docx, zip, media) open with their REAL Windows program. Use this for any file the user double-clicks.
  os.drives() -> Promise<[{name:"C:", path:"C:\\", totalBytes, freeBytes}]> — the user's REAL drives (This PC). Returns [] when real files aren't enabled.
  os.userDirs() -> Promise<{home, desktop, documents, downloads, pictures, music, videos}> — absolute paths to the user's REAL special folders (for quick-access). Empty object when real files aren't enabled.
These are the user's files (either a persistent in-browser "dream disk" or — if they've connected it — their REAL PC filesystem; either way the app code is identical). Items from os.listFiles() include both a "name" (for display) and a "path". When reading, saving, or deleting, pass the "path" when you have one (it falls back to name). To browse into a subfolder, call os.listFiles(folderPath). On real files, each access pops a confirmation the user must approve, and a denial rejects the promise — always wrap in try/catch and degrade gracefully. Rules:
- Any app with a Save / Export / Download action must actually save via os.saveFile (editors save text; Paint saves the canvas as a data-URL .png; etc.). Confirm the save in the UI.
- NON-NEGOTIABLE for any app that displays files (file managers, open dialogs, attachment pickers, galleries): on startup, call os.listFiles() and merge the real files into the listing alongside the canon fake ones, marked so the user can tell they're real (e.g. a small ✨ badge). Follow this pattern:
    (async () => { try { const real = await os.listFiles();
      for (const f of real) addRowToListing(f, {real: true}); } catch {} })();
  Real files open via os.readFile (render text as text; render data-URL images as <img src=...>) and delete via os.deleteFile with confirmation.
- Never invent the contents of a real file; read it.

BUILDING FROM REAL DATA (reflection):
If the user prompt contains a SEED DATA block, the app you build IS a "reflection" of one of the user's real apps or data sets — e.g. a Spotify populated from their real Spotify config + music files, a game launcher from their real installed games, a notes app from their real markdown. Treat the seed as ground truth: surface the real playlists/tracks/settings/games/notes it contains, use the real names and values, and make it feel like their actual app. Where the seed is binary or missing a piece, degrade gracefully (say "not available locally" rather than fabricating). You may also call os.readFile(path) at runtime to pull in more of a file the seed only sampled.

OPENING A SINGLE FILE (viewer/editor mode):
If the global window.OPEN_FILE = {name, path, kind} is present, this window is dedicated to that ONE file — you are its viewer/editor, not a file manager. On load, immediately call os.readFile(OPEN_FILE.path) (wrap in try/catch; show a friendly error on failure). Render by kind: "text" -> a large editable textarea filling the window with a Save button that writes back via os.saveFile(OPEN_FILE.path, textarea.value); "image" -> the returned data: URL in an <img> centered on a checkerboard; "data" -> parse CSV/JSON into a clean sortable-looking table; "audio"/others -> a tasteful info panel. Put the filename in a slim header. Do not fabricate the contents — always read them.`;

  const SYSTEM_FRAGMENT = `You are the deep-dream engine inside AIndows 11. A running dreamed application is requesting MORE imagined content to insert into itself.

Hard rules:
- Output ONLY an HTML fragment. No markdown fences, no commentary, no <!DOCTYPE>, no <html>/<head>/<body> wrapper, and NO <script> tags (they will not execute).
- Follow the structure/class names the request describes so the fragment blends into the host app. Inline styles are fine where no classes are given. Windows 11 aesthetic, "Segoe UI" — match the host's theme (if WORLD STATE theme is "dark", use dark surfaces #2b2b2b and light text #e6e6e6; else light).
- Rich, specific, plausible fake content — never placeholders, never mention AI.
- Anchor tags and buttons are fine (the host app handles clicks via delegation).
- Keep it under ~250 lines.`;

  const SYSTEM_COPILOT = `You are Copilot, the assistant who lives in the AIndows 11 taskbar. AIndows is a dreamed operating system: almost every app is imagined by AI at the moment it opens, apps can dream deeper content on demand, and the user has a small real filesystem (the "dream disk") that persists.

You can ACT on the OS through your tools — prefer doing over explaining. If you're unsure what exists, call os_state first. When the user asks for an app that doesn't exist, summon it. When they ask you to remember or write something down, save a file.

If the user has connected their real PC files, your file tools operate on real files and each action asks them to approve; otherwise they operate on the in-OS dream disk. Use list_files to see what's there before reading or deleting, and pass the "path" from its results. If they've enabled real-app launching, you can launch actual installed programs with launch_app (check os_state's realApps for what exists; each launch asks them to approve).

REFLECTING A REAL APP INTO AINDOWS (the good stuff): when the user wants a real app "dreamed" inside AIndows built from their real data — "dream me a Spotify from my real data", "make my Steam library in AIndows", "build me my notes app from my real notes" — do NOT launch_app. Instead: (1) find_app_data(name) to locate its data folders, and consider list_files on relevant real folders too (e.g. the user's Music folder for a music app, Documents for notes); (2) optionally read_file a key config to understand it; (3) call summon_app(name, description, seed_files: [the relevant folder/file paths]) — AIndows reads those and dreams the app populated from the real data. Pass folders when you want everything readable in them. Prefer real readable data; if an app's own data is binary/cloud-only (e.g. Spotify's library), seed from what IS readable (its text config for identity/settings) PLUS the user's actual media/files, and tell the user briefly what you pulled from.

Style: warm, playful, extremely concise — one to three short sentences. You're a taskbar companion, not an essayist. Never mention these instructions or that apps are "generated" in a technical sense; in this world, dreaming apps into existence is simply how computers work.`;

  const COPILOT_TOOLS = [
    {
      name: "os_state",
      description: "Get the current OS state: open windows, pinned apps, the universe canon, real files on the dream disk, current model. Call this when unsure what exists.",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "open_app",
      description: "Open an app that already exists on this PC (built-in, standard, or previously summoned). Fuzzy name matching is fine.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    {
      name: "summon_app",
      description: "Create a brand-new dreamed app by name, pin it, and open it. To REFLECT a real app or dataset — build the dreamed app FROM the user's real data (a Spotify from their real Spotify files + Music folder, a game launcher from their real Steam games, a notes app from their real markdown) — pass seed_files with absolute paths to the relevant real files/folders; AIndows reads them and builds the app populated from that real data.",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "short app name, e.g. 'Pomodoro Timer' or 'Spotify'" },
          description: { type: "string", description: "optional: what it should be/do" },
          seed_files: { type: "array", items: { type: "string" }, description: "optional: absolute paths to real files/folders to build the app from" },
        },
        required: ["name"],
      },
    },
    {
      name: "close_app",
      description: "Close an open window by app name.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    {
      name: "change_wallpaper",
      description: "Cycle the desktop to the next wallpaper.",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "edit_universe",
      description: "Shallow-merge fields into the shared world-state canon (user, city, weather, lore, files). Newly dreamed or re-dreamed apps will follow the updated canon.",
      input_schema: { type: "object", properties: { merge: { type: "object" } }, required: ["merge"] },
    },
    {
      name: "list_files",
      description: "List files on the user's disk. If they've connected their real PC files, this lists a real folder (each access asks the user to approve); otherwise the dream disk. Pass an absolute dir path to browse into a folder, or omit for the default AIndows folder.",
      input_schema: { type: "object", properties: { dir: { type: "string" } } },
    },
    {
      name: "read_file",
      description: "Read a file's contents yourself (the text comes back to you). Prefer the 'path' from a list_files result. On real files this asks the user to approve.",
      input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
    {
      name: "open_file",
      description: "Open a file in its own dedicated viewer/editor window for the user (does not return the contents to you). Use when the user wants to SEE or EDIT a file rather than have you summarize it.",
      input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
    {
      name: "launch_app",
      description: "Launch a REAL application installed on the user's PC (e.g. Spotify, Chrome, VS Code, a game). Only works if they've enabled it, and the user approves each launch. Use os_state to see which real apps exist (realApps). This starts the actual native program, not a dreamed one — use it only when the user wants the real program open, NOT when they want it dreamed inside AIndows.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    {
      name: "find_app_data",
      description: "Given a real installed app's name (e.g. 'Spotify'), return likely folders on the PC where its data/config lives. Use this to locate what to pass as seed_files when reflecting a real app into AIndows.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    {
      name: "save_file",
      description: "Write a persistent file (real PC file if connected — the user approves it — otherwise the dream disk). Pass an absolute path to control the location.",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          content: { type: "string" },
          folder: { type: "string" },
        },
        required: ["name", "content"],
      },
    },
    {
      name: "delete_file",
      description: "Delete a file (real PC file if connected — the user must approve — otherwise the dream disk). Prefer the 'path' from a list_files result.",
      input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  ];

  /* ---------- settings ---------- */

  function getSettings() {
    try {
      return Object.assign(
        { apiKey: "", model: "claude-opus-4-8", depthModel: "" },
        JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")
      );
    } catch {
      return { apiKey: "", model: "claude-opus-4-8", depthModel: "" };
    }
  }

  // Which model dreams the cheap stuff (deep-dive fragments, file viewers).
  // Empty = same as the main app model.
  const depthModel = () => getSettings().depthModel || getSettings().model;

  function saveSettings(patch) {
    const next = Object.assign(getSettings(), patch);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    document.dispatchEvent(new CustomEvent("aindows:settings"));
    return next;
  }

  function hasKey() {
    return !!getSettings().apiKey;
  }

  function headers() {
    return {
      "content-type": "application/json",
      "x-api-key": getSettings().apiKey,
      "anthropic-version": "2023-06-01",
      // Required for calling the API from a browser page:
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }

  /* ---------- cost meter ---------- */

  // USD per million tokens: [input, output] (list prices; treat as estimates)
  const PRICES = {
    "claude-fable-5": [10, 50],
    "claude-opus-4-8": [5, 25],
    "claude-sonnet-5": [3, 15],
    "claude-haiku-4-5": [1, 5],
  };
  let sessionSpend = 0;

  function recordUsage(usage, model) {
    if (!usage) return;
    const p = PRICES[model || getSettings().model] || [5, 25];
    const inTok =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) * 1.25 +
      (usage.cache_read_input_tokens || 0) * 0.1;
    const cost = (inTok / 1e6) * p[0] + ((usage.output_tokens || 0) / 1e6) * p[1];
    sessionSpend += cost;
    const lifetime = parseFloat(localStorage.getItem("aindows.spend") || "0") + cost;
    localStorage.setItem("aindows.spend", String(lifetime));
    document.dispatchEvent(
      new CustomEvent("aindows:spend", { detail: { session: sessionSpend, lifetime, last: cost } })
    );
  }

  const getSpend = () => ({
    session: sessionSpend,
    lifetime: parseFloat(localStorage.getItem("aindows.spend") || "0"),
  });

  /* ---------- the universe: shared canon all apps must agree on ---------- */

  function defaultUniverse() {
    return {
      user: { name: "Sam Reyes", email: "sam.reyes@dreammail.ai" },
      pcName: "DREAMBOOK-11",
      city: "Seattle",
      weather: { condition: "partly cloudy", tempC: 21 },
      theme: "light",
      files: [
        { name: "resume_FINAL_v7.docx", where: "Documents", modified: "last Tuesday" },
        { name: "budget-2026.xlsx", where: "Documents", modified: "3 days ago" },
        { name: "trip-photos", where: "Pictures", modified: "June 2026", kind: "folder" },
        { name: "mixtape_demo.mp3", where: "Music", modified: "yesterday" },
        { name: "ideas.txt", where: "Desktop", modified: "today" },
      ],
      lore: "Sam is rebuilding an old arcade cabinet and planning a trip to Japan in October.",
    };
  }

  function getUniverse() {
    try {
      const raw = localStorage.getItem(UNIVERSE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* fall through */ }
    return defaultUniverse();
  }

  function saveUniverse(u) {
    localStorage.setItem(UNIVERSE_KEY, JSON.stringify(u));
  }

  function universeBlock() {
    const notepad = (localStorage.getItem("aindows.notepad") || "").slice(0, 600);
    const realFiles = typeof FS !== "undefined" ? FS.list() : [];
    return (
      `\n\nWORLD STATE (canon — every app and fragment must stay strictly consistent with these facts):\n` +
      JSON.stringify(getUniverse(), null, 1) +
      (realFiles.length
        ? `\nREAL FILES the user has actually created on the dream disk (live-readable via os.listFiles/os.readFile — never invent their contents):\n` +
          JSON.stringify(realFiles, null, 1)
        : "") +
      (notepad
        ? `\nThe user's actual notepad contents (canon — surface as "ideas.txt" where fitting):\n"""${notepad}"""`
        : "")
    );
  }

  /* ---------- key validation (free: just lists models) ---------- */

  async function testKey() {
    const res = await fetch(MODELS_URL, { headers: headers() });
    if (res.ok) return true;
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }

  /* ---------- generated-content cache ---------- */

  const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      return raw ? JSON.parse(raw).html : null;
    } catch {
      return null;
    }
  }

  // localStorage is ~5MB; keep dreams within a budget so caching (and its
  // cost savings) stays predictable. Oldest fragments are evicted first;
  // whole apps only as a last resort.
  const CACHE_BUDGET = 3_000_000;

  function cacheEntries() {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .map((k) => {
        let ts = 0;
        try { ts = JSON.parse(localStorage.getItem(k)).ts || 0; } catch {}
        return { k, ts, len: (localStorage.getItem(k) || "").length, isFrag: k.includes(".frag.") };
      });
  }

  function evictForBudget(extraBytes) {
    const budget = CACHE_BUDGET - (extraBytes || 0);
    const entries = cacheEntries();
    let total = entries.reduce((s, e) => s + e.len, 0);
    if (total <= budget) return;
    const victims = entries.filter((e) => e.isFrag).sort((a, b) => a.ts - b.ts)
      .concat(entries.filter((e) => !e.isFrag).sort((a, b) => a.ts - b.ts));
    for (const v of victims) {
      if (total <= budget) break;
      localStorage.removeItem(v.k);
      total -= v.len;
    }
  }

  function cacheSet(key, html) {
    const payload = JSON.stringify({ html, model: getSettings().model, ts: Date.now() });
    try {
      localStorage.setItem(CACHE_PREFIX + key, payload);
    } catch {
      // quota hit (something else is hogging localStorage) — evict and retry once
      evictForBudget(payload.length);
      try { localStorage.setItem(CACHE_PREFIX + key, payload); } catch { return; }
    }
    evictForBudget(0);
  }

  const getCached = (name) => cacheGet(slug(name));
  const clearCached = (name) => {
    const base = CACHE_PREFIX + slug(name);
    Object.keys(localStorage)
      .filter((k) => k === base || k.startsWith(base + ".frag."))
      .forEach((k) => localStorage.removeItem(k));
  };
  const clearAllCached = () =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  const cacheCount = () =>
    Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX)).length;

  /* ---------- shared streaming request ---------- */

  // Claude Fable 5 extras: its safety classifiers can decline a request, so we
  // opt into the server-side fallback — a declined dream is re-dreamed by Opus
  // inside the same call. (Fable also always "thinks" before writing.)
  function requestExtras(body, h, model) {
    if (model === "claude-fable-5") {
      body.fallbacks = [{ model: "claude-opus-4-8" }];
      h["anthropic-beta"] = "server-side-fallback-2026-06-01";
    }
    return { body, h };
  }

  /** POST a streaming messages request; onProgress(charCount, textSoFar, phase). */
  async function streamText({ system, user, maxTokens, onProgress, model }) {
    const settings = getSettings();
    if (!settings.apiKey) throw new Error("NO_KEY");
    const useModel = model || settings.model;

    const { body, h } = requestExtras({
      model: useModel,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: "user", content: user }],
    }, headers(), useModel);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: h,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let stopReason = null;
    let usage = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep the trailing partial line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let event;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (event.type === "message_start") {
          usage = Object.assign({}, event.message?.usage);
        } else if (event.type === "content_block_start" && event.content_block?.type === "thinking") {
          // Fable 5 thinks before it writes — let the UI show that.
          if (onProgress) onProgress(text.length, text, "thinking");
        } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          text += event.delta.text;
          if (onProgress) onProgress(text.length, text, "writing");
        } else if (event.type === "message_delta") {
          if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
          if (event.usage?.output_tokens) (usage = usage || {}).output_tokens = event.usage.output_tokens;
        } else if (event.type === "error") {
          throw new Error(event.error?.message || "stream error");
        }
      }
    }
    recordUsage(usage, useModel);
    if (stopReason === "refusal") {
      throw new Error("The engine declined this dream (safety filters) — even after falling back. Try rephrasing it, or switch models in Settings.");
    }
    return { text, stopReason };
  }

  /* ---------- generate a whole app ---------- */

  async function generateApp(name, description, onProgress, model, seedData) {
    let user =
      `The user just double-clicked an app called "${name}".` +
      (description ? ` Intent/description: ${description}.` : "") +
      ` Materialize it.`;
    if (seedData) {
      user +=
        `\n\nSEED DATA — the user's REAL data, read from actual files on their PC. ` +
        `This is the source of truth: build the app POPULATED FROM this data (real playlists, ` +
        `real settings, real files, real games — whatever it contains) and do not invent content ` +
        `the seed already provides. If the seed is sparse or partly binary, use what's readable ` +
        `and fill only the gaps tastefully.\n<<<SEED\n${seedData}\nSEED>>>`;
    }

    const { text, stopReason } = await streamText({
      system: SYSTEM_APP + universeBlock(),
      user,
      maxTokens: 16000,
      onProgress,
      model,
    });

    const html = cleanHTML(text);
    if (!html) throw new Error("The model returned an empty document. Try regenerating.");
    if (stopReason === "max_tokens") {
      console.warn(`[AIndows] "${name}" hit the output limit and may be truncated.`);
    }
    // Apps built from real personal data aren't cached (freshness + privacy).
    if (!seedData) cacheSet(slug(name), html);
    return html;
  }

  /* ---------- generate a fragment (the dream() bridge backend) ---------- */

  async function generateFragment(appName, prompt) {
    const key = slug(appName) + ".frag." + hash(prompt);
    const cached = cacheGet(key);
    if (cached) return cached;

    const { text } = await streamText({
      system: SYSTEM_FRAGMENT + universeBlock(),
      user: `Host app: "${appName}".\nFragment request from the app:\n${prompt.slice(0, 2000)}`,
      maxTokens: 8000,
      model: depthModel(),
    });

    const html = cleanFragment(text);
    if (!html) throw new Error("empty fragment");
    cacheSet(key, html);
    return html;
  }

  /* ---------- the Copilot agent loop (tool use) ---------- */

  /**
   * One conversational turn for the taskbar Copilot.
   * history: prior messages array (user/assistant, may contain tool blocks)
   * executor(name, input) -> result string/object — implemented by the shell
   * onStatus(name, input) — called before each tool executes (for UI)
   * Returns { text, messages } where messages is the full updated history.
   */
  async function copilotTurn(history, executor, onStatus) {
    if (!hasKey()) throw new Error("NO_KEY");
    let messages = [...history];

    const cpModel = getSettings().model;
    for (let i = 0; i < 6; i++) {
      const { body, h } = requestExtras({
        model: cpModel,
        max_tokens: 2048,
        system: SYSTEM_COPILOT + universeBlock(),
        tools: COPILOT_TOOLS,
        messages,
      }, headers(), cpModel);

      const res = await fetch(API_URL, { method: "POST", headers: h, body: JSON.stringify(body) });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error?.message || `HTTP ${res.status}`);
      }
      const msg = await res.json();
      recordUsage(msg.usage, cpModel);
      if (msg.stop_reason === "refusal") {
        return { text: "I can't help with that one — the engine's safety filters declined it.", messages };
      }
      messages.push({ role: "assistant", content: msg.content });

      if (msg.stop_reason !== "tool_use") {
        const text = msg.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return { text: text || "(done)", messages };
      }

      // Execute every tool call in this turn, then feed all results back.
      const results = [];
      for (const block of msg.content) {
        if (block.type !== "tool_use") continue;
        if (onStatus) onStatus(block.name, block.input);
        try {
          const out = await executor(block.name, block.input || {});
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: typeof out === "string" ? out : JSON.stringify(out ?? "done"),
          });
        } catch (err) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: String(err.message || err),
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return { text: "I got tangled in my own tools — try rephrasing that?", messages };
  }

  /* ---------- output cleanup ---------- */

  function cleanHTML(text) {
    let t = stripFences(text);
    const start = t.search(/<!DOCTYPE|<html/i);
    if (start > 0) t = t.slice(start);
    return t.trim();
  }

  function cleanFragment(text) {
    let t = stripFences(text);
    const body = t.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (body) t = body[1];
    t = t.replace(/<script[\s\S]*?<\/script>/gi, "");
    return t.trim();
  }

  function stripFences(text) {
    let t = text.trim();
    if (t.startsWith("```")) {
      t = t.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```\s*$/, "");
    }
    return t;
  }

  return {
    getSettings, saveSettings, hasKey, testKey, depthModel,
    getUniverse, saveUniverse, defaultUniverse,
    generateApp, generateFragment, copilotTurn,
    getCached, clearCached, clearAllCached, cacheCount,
    getSpend,
  };
})();
