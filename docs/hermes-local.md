# Hermes local development

Pachimanga uses Hermes Agent's project context and project-local skills.

## First-time setup on Windows

From PowerShell in the repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-hermes-local.ps1
```

This configures the Hermes terminal backend as local, sets the working directory to `F:\LF\pachimanga`, trusts this repository's project-local skills, and runs `hermes doctor`.

Hermes recognizes project skills under `.hermes/skills/`. Project skills must be trusted once before Hermes loads them.

## Start

```powershell
.\scripts\start-hermes.ps1
```

Or simply:

```powershell
Set-Location F:\LF\pachimanga
hermes
```

Hermes automatically loads the existing root `AGENTS.md` as project context. Do not add `.hermes.md` unless it intentionally replaces that context, because `.hermes.md` has higher priority.

## Included project skills

- `pachimanga-dev`: implementation, debugging, refactoring, git discipline, and quality gates.
- `pachimanga-ui`: PWA-first UI/design/accessibility and reader layout work.
- `pachimanga-supabase`: auth, RLS, migrations, account isolation, and sync safety.

Native platform release work remains deferred unless explicitly requested.
