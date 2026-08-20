# Agent Instructions for lechoppe-official

This document defines standard operating guidelines and repository-specific instructions for AI agents working in this codebase.

---

## 1. General Agent Rules

- **Inspect Existing Code**: Always inspect existing patterns, conventions, and implementation details before proposing or making changes.
- **Minimal & Scoped Changes**: Keep modifications focused strictly on the requested task. Avoid incidental refactoring.
- **Do Not Modify Unrelated Files**: Only touch files directly required for the given task.
- **Git Status Hygiene**: Always check `git status` before starting work.
- **Preserve Uncommitted Changes**: Never discard, overwrite, or revert existing uncommitted changes.
- **No Unsolicited Git Actions**: Do not commit, push, merge, or create new branches unless explicitly instructed by the user.
- **Dependency Discipline**: Do not introduce new libraries or dependencies unless strictly necessary and approved.
- **Diff Review**: Always review the git diff after implementation to verify changes and ensure no unexpected edits or artifacts are introduced.
- **Validation**: Run appropriate validation (e.g., type checking with `npx tsc --noEmit` and build verification) before declaring a task complete.
- **Validation Reporting**: Clearly state which validation checks passed and explicitly report any validations that could not be executed (e.g. due to missing runtime environments or services).
- **Architecture Proposals**: For non-trivial or significant architectural changes, propose the approach and get user alignment before implementation.

---

## 2. Project Architecture & Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, PostgreSQL (`pg`).
- **Database Abstraction**:
  - **Client-Side**: Use `createClient()` from `@/lib/postgres/client` (provides a Supabase-compatible query builder over local `/api/db/[table]`).
  - **Server-Side API Routes**: Use direct `pool.query()` from `@/lib/postgres/db`.
  - **No Supabase Dependency**: Do **not** reintroduce `@supabase/supabase-js`; the codebase has fully transitioned to self-hosted PostgreSQL.
- **Styling & Theme Variables**:
  - Rely on CSS variables defined in `app/globals.css` (`var(--bg)`, `var(--fg)`, `var(--surface)`, `var(--border)`, `var(--font-bebas)`, `var(--font-inter)`).
  - Use custom utility classes like `.bg-bg`, `.bg-surface`, `.text-fg`, and `.border-theme`.
  - Do not hardcode arbitrary hex colors for theme-sensitive UI components.

---

## 3. Multi-Language & i18n Conventions

- **4-Language Support**: All user-facing UI copy must support **French (fr)**, **English (en)**, **Spanish (es)**, and **Italian (it)**.
- **Translation Hook**: Import and use `const { t, lang } = useLang()` from `@/context/LangContext`.
- **Translation Call Convention**: Always provide complete translation dictionaries:
  ```tsx
  t({
    fr: "Texte en français",
    en: "English text",
    es: "Texto en español",
    it: "Testo in italiano"
  })
  ```

---

## 4. Database & API Guardrails

- **Table & Column Whitelists**:
  - Any new database table must be added to `ALLOWED_TABLES` in `lib/postgres/db.ts`.
  - Any new column exposed to queries or mutations must be added to the `COLUMNS` whitelist in `app/api/db/[table]/route.ts`.
- **SQL Migrations & Schema**:
  - Place persistent schema changes in `db/init/`.
  - If runtime migrations or programmatic setup are required, update `app/api/admin/setup/route.ts` and `app/api/admin/migrate/route.ts`.
- **Data Fallbacks**:
  - Always maintain graceful fallbacks to static data (e.g. `STATIC_MENU` in `data/menu.ts` or `DEFAULT_CONTENT` in `lib/hooks/useSiteContent.ts`) in case the database is temporarily unreachable.

---

## 5. Animation & Scroll Management

- **Smooth Scroll (Lenis)**: Smooth scrolling is active application-wide via `SmoothScrollProvider.tsx`.
- **Modal Scroll Isolation**: For popups, drawers, or scrollable modal overlays, add `data-lenis-prevent="true"` and pause Lenis on mount (`(window as any).lenis?.stop()`) to prevent background page scrolling.
- **Mobile Animation Scaling**: Use `useMobileMotion` from `@/lib/hooks/useMobileMotion` to appropriately scale animation durations on mobile viewports.

---

## 6. Security & Secret Hygiene

- **Never Commit Secrets**: Never commit `.env` files, production credentials, or private SSH/PEM keys.
- **Admin Authentication**: All mutation endpoints (`POST`, `PATCH`, `DELETE`) on protected tables in `/api/db/[table]` and `/api/images` must enforce the `lechoppe_admin_auth` cookie check.

---

## 7. Quality & Build Checks

- **TypeScript Compilation**: `next.config.ts` currently sets `ignoreBuildErrors: true` for container packaging. Because of this, agents **must** run `npx tsc --noEmit` manually to verify that zero type errors or regressions are present before concluding work.
- **Container Compatibility**: Ensure all code changes remain compatible with the multi-stage standalone Node 22 Docker container build.

---

## Multi-Agent Workflow

- AGENTS.md is the source of truth for persistent project instructions.
- Feature-specific requirements and plans should be stored under `docs/`.
- Agents must inspect existing changes before modifying files.
- Do not overwrite another agent's uncommitted work.
- When implementing from a plan created by another agent, validate the plan against the actual codebase first.
- If implementation deviates materially from the plan, document the reason.
