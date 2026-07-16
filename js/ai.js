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
- Visual style: native Windows 11 app. font-family "Segoe UI", light theme (#f9f9f9 / #ffffff surfaces), accent color #0067c0, rounded corners (4-8px), subtle 1px borders rgba(0,0,0,.08), comfortable padding. The document fills the window: html,body{height:100%;margin:0}.
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
  os.listFiles() -> Promise<[{name, folder, kind, size, modified}]>
  os.readFile(name) -> Promise<string>
  os.saveFile(name, content, folder?) -> Promise<{ok}>
  os.deleteFile(name) -> Promise<{ok}>
These are the user's REAL files. They persist across apps and reboots. Rules:
- Any app with a Save / Export / Download action must actually save via os.saveFile (editors save text; Paint saves the canvas as a data-URL .png; etc.). Confirm the save in the UI.
- Any app that displays files (file managers, open dialogs, attachment pickers, galleries) must call os.listFiles() on startup and merge the real files into the listing alongside the canon fake ones — visually distinguishable is nice (the real ones are the user's own work). Real files open via os.readFile (render text as text; render data-URL images as <img src=...>), and delete via os.deleteFile with confirmation.
- Never invent the contents of a real file; read it.`;

  const SYSTEM_FRAGMENT = `You are the deep-dream engine inside AIndows 11. A running dreamed application is requesting MORE imagined content to insert into itself.

Hard rules:
- Output ONLY an HTML fragment. No markdown fences, no commentary, no <!DOCTYPE>, no <html>/<head>/<body> wrapper, and NO <script> tags (they will not execute).
- Follow the structure/class names the request describes so the fragment blends into the host app. Inline styles are fine where no classes are given. Windows 11 light aesthetic, "Segoe UI".
- Rich, specific, plausible fake content — never placeholders, never mention AI.
- Anchor tags and buttons are fine (the host app handles clicks via delegation).
- Keep it under ~250 lines.`;

  const SYSTEM_COPILOT = `You are Copilot, the assistant who lives in the AIndows 11 taskbar. AIndows is a dreamed operating system: almost every app is imagined by AI at the moment it opens, apps can dream deeper content on demand, and the user has a small real filesystem (the "dream disk") that persists.

You can ACT on the OS through your tools — prefer doing over explaining. If you're unsure what exists, call os_state first. When the user asks for an app that doesn't exist, summon it. When they ask you to remember or write something down, save a file.

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
      description: "Create a brand-new dreamed app by name, pin it to the desktop, and open it. Use when no existing app fits the request.",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "short app name, e.g. 'Pomodoro Timer'" },
          description: { type: "string", description: "optional: what it should be/do" },
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
      name: "save_file",
      description: "Write a real, persistent file to the user's dream disk (visible in file-listing apps).",
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
      description: "Delete a real file from the dream disk.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
  ];

  /* ---------- settings ---------- */

  function getSettings() {
    try {
      return Object.assign(
        { apiKey: "", model: "claude-opus-4-8" },
        JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")
      );
    } catch {
      return { apiKey: "", model: "claude-opus-4-8" };
    }
  }

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
    "claude-opus-4-8": [5, 25],
    "claude-sonnet-5": [3, 15],
    "claude-haiku-4-5": [1, 5],
  };
  let sessionSpend = 0;

  function recordUsage(usage) {
    if (!usage) return;
    const p = PRICES[getSettings().model] || [5, 25];
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

  function cacheSet(key, html) {
    try {
      localStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify({ html, model: getSettings().model, ts: Date.now() })
      );
    } catch {
      /* localStorage full — content just regenerates next time */
    }
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

  /** POST a streaming messages request; onProgress(charCount, textSoFar). */
  async function streamText({ system, user, maxTokens, onProgress }) {
    const settings = getSettings();
    if (!settings.apiKey) throw new Error("NO_KEY");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: settings.model,
        max_tokens: maxTokens,
        stream: true,
        system,
        messages: [{ role: "user", content: user }],
      }),
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
        } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          text += event.delta.text;
          if (onProgress) onProgress(text.length, text);
        } else if (event.type === "message_delta") {
          if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
          if (event.usage?.output_tokens) (usage = usage || {}).output_tokens = event.usage.output_tokens;
        } else if (event.type === "error") {
          throw new Error(event.error?.message || "stream error");
        }
      }
    }
    recordUsage(usage);
    return { text, stopReason };
  }

  /* ---------- generate a whole app ---------- */

  async function generateApp(name, description, onProgress) {
    const user =
      `The user just double-clicked an app called "${name}".` +
      (description ? ` Intent/description: ${description}.` : "") +
      ` Materialize it.`;

    const { text, stopReason } = await streamText({
      system: SYSTEM_APP + universeBlock(),
      user,
      maxTokens: 16000,
      onProgress,
    });

    const html = cleanHTML(text);
    if (!html) throw new Error("The model returned an empty document. Try regenerating.");
    if (stopReason === "max_tokens") {
      console.warn(`[AIndows] "${name}" hit the output limit and may be truncated.`);
    }
    cacheSet(slug(name), html);
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

    for (let i = 0; i < 6; i++) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model: getSettings().model,
          max_tokens: 2048,
          system: SYSTEM_COPILOT + universeBlock(),
          tools: COPILOT_TOOLS,
          messages,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `HTTP ${res.status}`);
      }
      const msg = await res.json();
      recordUsage(msg.usage);
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
    getSettings, saveSettings, hasKey, testKey,
    getUniverse, saveUniverse, defaultUniverse,
    generateApp, generateFragment, copilotTurn,
    getCached, clearCached, clearAllCached, cacheCount,
    getSpend,
  };
})();
