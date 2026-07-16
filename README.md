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
- **Snap layouts** — drag windows to edges/corners for halves and quarters,
  top edge to maximize.
- **Cost meter** — the tray shows a running ≈$ estimate of API spend
  (session, lifetime, and per-dream in the tooltip).

## Costs

Each *fresh* generation is one API call (roughly 3–10k output tokens — a few
cents on the default Opus 4.8, well under a cent on Haiku, selectable in
Settings). Generated apps are cached in localStorage, so re-opening is instant
and free. The 🔄 button in a window's title bar re-dreams that one app;
Settings can forget all of them.

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
