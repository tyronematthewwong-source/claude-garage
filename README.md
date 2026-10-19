# Claude Garage: 3 free Claude Code mods

Three mods that bolt onto Claude Code, from the Paper Crab "Pimp My Claude" reel.

| Mod | What it does | How to use it |
|---|---|---|
| **Pit Crew** | Three helper agents run one after another: a **scout** researches, a **writer** drafts, a **crew chief** checks the work and signs off. | `/crew <task>`, e.g. `/crew find 5 dentists in Austin and write each a one-line cold email` |
| **Fuel Saver** | Easy prompts go to Haiku, Claude's cheapest model, on their own. Hard ones stay on your main model. A status line counts how many it rerouted. | Runs by itself. `/fuel off`, `/fuel on`, `/fuel reset` |
| **Dashboard** | A side panel with your to-dos and live session gauges (turns, tool calls, edits). | `/dash` to open it, `/todo <thing>` to add one, click a to-do to tick it off |

## Install

In a terminal, run Claude Code and type each line at the prompt (install one, two or all three):

```
/plugin install pit-crew --marketplace tyronematthewwong-source/claude-garage
/plugin install fuel-saver --marketplace tyronematthewwong-source/claude-garage
/plugin install dashboard --marketplace tyronematthewwong-source/claude-garage
```

Answer `y` to add the marketplace, then press Enter to pick the user scope. The mod is active right away.

From a shell instead:

```
claude plugin install pit-crew --marketplace tyronematthewwong-source/claude-garage
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to the prompt box → **Plugins** → **Add marketplace** with `tyronematthewwong-source/claude-garage`, then **Add plugin**.

## Good to know

- **Fuel Saver** only reroutes in the first 20 messages of a chat. After that, switching models would throw away the main model's prompt cache and could cost more, so it stays put. It asks for Haiku by its full model ID (`claude-haiku-5-5`). If your account can't use that model, Fuel Saver pauses itself and says so; `/fuel on` tries again.
- **Pit Crew** runs real agents with web search, so a crew run uses more of your usage than a normal prompt. The writer marks anything the scout couldn't verify as `[NEEDS CHECK]`. Check facts before you send anything it writes.
- **Dashboard** keeps your to-dos between sessions on your own machine. Nothing is sent anywhere.
- These are Claude Code mods (hooks plugins), an early-access feature, so they may need updates as Claude Code changes.

Each mod has its tests in `tests/`: `claude plugin test <mod folder>`.
