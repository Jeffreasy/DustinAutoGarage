---
trigger: always_on
---

# DustinOpzet — Project Rules

> Full agent/skill rules are in `.agent/rules/GEMINI.md`. This file handles slash command routing.

---

## ⚡ SLASH COMMAND DISPATCHER (HIGHEST PRIORITY)

> 🔴 **MANDATORY:** When the user message starts with `/`, execute this block IMMEDIATELY — before the Socratic gate, before classification, before anything else.

### Protocol

1. **Detect:** User message starts with `/command [optional arguments]`
2. **Extract:** `command` = word after `/` | `$ARGUMENTS` = everything after the command
3. **Read:** Open `.agent/workflows/{command}.md` using `view_file` tool
4. **Execute:** Follow ALL steps in that file exactly. Replace `$ARGUMENTS` with the extracted arguments.
5. **Never skip:** Always re-read the file — do not rely on memory of previous readings.

### Command → File Mapping

| Slash Command    | Workflow File                       |
| ---------------- | ----------------------------------- |
| `/brainstorm`    | `.agent/workflows/brainstorm.md`    |
| `/create`        | `.agent/workflows/create.md`        |
| `/debug`         | `.agent/workflows/debug.md`         |
| `/deploy`        | `.agent/workflows/deploy.md`        |
| `/enhance`       | `.agent/workflows/enhance.md`       |
| `/orchestrate`   | `.agent/workflows/orchestrate.md`   |
| `/plan`          | `.agent/workflows/plan.md`          |
| `/preview`       | `.agent/workflows/preview.md`       |
| `/status`        | `.agent/workflows/status.md`        |
| `/test`          | `.agent/workflows/test.md`          |
| `/ui-ux-pro-max` | `.agent/workflows/ui-ux-pro-max.md` |

> **Unknown command?** → Respond: "Unknown command `/xyz`. Available commands: /brainstorm /create /debug /deploy /enhance /orchestrate /plan /preview /status /test /ui-ux-pro-max"

---

## Extended Rules

See `.agent/rules/GEMINI.md` for the full agent routing, skill loading, and code quality rules.
