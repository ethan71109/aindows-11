# AIndows 11 🪟✨

A Windows 11 that mostly doesn't exist.

The desktop, the window manager, the taskbar and the Start menu are real code
(plain HTML/CSS/JS, no frameworks, no build step). Almost everything else —
File Explorer, Paint, Minesweeper, Weather, Mail, the Terminal — **is written
from scratch by Claude at the moment you double-click it.** The files in the
Explorer were never created. The emails in the inbox were never sent.

This is the "flip the architecture" version of AI-generated-world projects like
Oasis (AI Minecraft) and NeuralOS: instead of a neural net predicting pixels,
an LLM generates the actual UI code live.

## Run it

No install. Either:

- double-click `index.html`, or
- serve it (nicer): `python -m http.server 8000` → http://localhost:8000

## Or run it as a real Windows app (.exe)

The repo doubles as an Electron app that wraps the OS in a native window
and **auto-updates itself** from this repo's GitHub Releases.

```bash
npm install        # once
npm start          # run it as a desktop app (dev)
npm run dist       # build the installer → dist/AIndows 11 Setup <version>.exe
```

Notes:
- The installer is unsigned, so Windows SmartScreen will warn on first run —
  click "More info → Run anyway". Normal for hobby apps.
- The desktop app has its own storage (separate from your browser), so enter
  your API key in Settings again on first launch.

### Releasing an update (auto-update flow)

Installed copies check this repo's **latest GitHub Release** on every launch
and update themselves. To ship a new version:

1. Bump `"version"` in `package.json` (e.g. `1.0.1`) **and the matching
   `?v=` query on the `<script>`/`<link>` tags in `index.html`** (that busts
   stale cached JS for web/GitHub-Pages visitors; the desktop app loads from
   disk so it doesn't strictly need it, but keep them in sync)
2. `npm run dist`
3. Create a GitHub release tagged `v1.0.1` and attach everything electron-builder
   put in `dist/` for that build: the `Setup .exe`, the `.blockmap`, **and
   `latest.yml`** (that's the file updaters read — don't forget it)

Or do it in one step with a GitHub token: `set GH_TOKEN=...` then `npm run release`
(builds and uploads the release automatically).

## Wake the imagination engine

1. Get a Claude API key at https://platform.claude.com
2. In AIndows, open **⚙️ Settings**, paste the key, hit **Test connection**, **Save**
3. Double-click anything marked *✨ dreamed*

The key is stored only in your browser's localStorage and sent only to
`api.anthropic.com`. Dreamed apps run inside a sandboxed iframe
(`sandbox="allow-scripts"`, no same-origin), so generated code can never read
your key or your data.

## The party tricks

- **Summoning** — open the Start menu, type an app that has never existed —
  `Dream Journal`, `Excuse Generator 3000`, `Cat Stock Exchange` — press
  **Enter**. It gets built on the spot and pinned to your desktop.
- **Infinite depth** — dreamed apps get a `dream(prompt)` bridge into the OS,
  so they can keep imagining deeper: folders in the dreamed Explorer actually
  open, links in the dreamed Browser actually go somewhere, replying to a fake
  email gets a reply back. Every level is generated the moment you click it
  (and cached after).
- **Watch the dream** — while an app generates, its source code streams past
  in the window, matrix-style, until the finished app snaps into place.
- **One universe** — all apps share a canon (who you are, what's on your disk,
  the weather, whatever you typed in Notepad) so the dream is coherent across
  apps. Edit it in Settings → Universe and re-dream to reroll your reality.
- **Export** — 💾 saves any dreamed app as a standalone `.html` you can send
  to friends. Right-click icons/desktop for more (re-dream, unpin, wallpaper).
- **The world remembers** — apps get a real (localStorage-backed) filesystem
  through the bridge: save a drawing in Paint and it's *actually there* in
  File Explorer, forever. The "dream disk" persists across reboots.
- **Copilot** — 🤖 in the taskbar. A real tool-using agent: "open minesweeper",
  "summon a pomodoro timer", "save a packing list for Japan", "make the
  weather stormier" — it acts on the OS instead of explaining.
- **Launch real installed apps** (desktop app, opt-in) — turn on "Launch my
  real PC apps" in Settings, then type an installed app's name in Start and
  click the 🖥️ result, or ask Copilot. AIndows only launches apps already in
  your Start menu (never arbitrary commands), and every launch asks you to
  approve it.
- **Snap layouts** — drag windows to edges/corners for halves and quarters,
  top edge to maximize.
- **Cost meter** — the tray shows a running ≈$ estimate of API spend
  (session, lifetime, and per-dream in the tooltip).

## Costs

Each *fresh* generation is one API call (roughly 3–10k output tokens — a few
cents on the default Opus 4.8, well under a cent on Haiku, selectable in
Settings). Claude Fable 5 is also available for the deepest dreams — it's
Anthropic's most capable model, about 2× Opus pricing, and it visibly *thinks*
before the code starts streaming. (If its safety filters ever decline a dream,
AIndows automatically falls back to Opus inside the same request.) Generated
apps are cached in localStorage, so re-opening is instant and free. The 🔄
button in a window's title bar re-dreams that one app; Settings can forget all
of them.

## Files

| File | What it is |
|---|---|
| `index.html` | the shell: boot screen, desktop, taskbar, start menu, copilot panel |
| `css/os.css` | all Windows-11-ish styling |
| `js/os.js` | window manager (drag/snap/minimize/maximize), taskbar, start menu, the os bridge, Copilot UI |
| `js/apps.js` | app registry + the only three real apps (Welcome, Notepad, Settings) |
| `js/ai.js` | the imagination engine: app/fragment generation, the Copilot agent loop, cost tracking |
| `js/fs.js` | the dream disk: a tiny persistent virtual filesystem |

Not affiliated with Microsoft. Obviously.
