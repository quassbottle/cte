# Player Profile Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать аватары и внутренние ссылки на профили игроков в статистике и multiplayer history.

**Architecture:** Player statistics получает опциональный `avatarUrl` из backend. Два существующих Svelte-компонента используют `/users/{id}` без нового общего компонента; multiplayer score использует уже доступный nullable `userId`.

**Tech Stack:** NestJS, Drizzle SQL, Zod DTO, Svelte 5, Bun/Jest, Orval.

## Global Constraints

- Ссылка профиля: `/users/{internalUserId}`.
- Team rows остаются без аватара и ссылки.
- Score с `userId = null` остаётся некликабельным.
- Не добавлять зависимости и новый общий UI-компонент.
- Generated API-файлы обновлять только существующей командой Orval.

---

### Task 1: Player avatar in stage statistics contract

**Files:**
- Modify: `apps/backend/src/modules/stage/stage-statistics.service.spec.ts`
- Modify: `apps/backend/src/modules/stage/stage-statistics.service.ts`
- Modify: `apps/backend/src/modules/stage/dto/index.spec.ts`
- Modify: `apps/backend/src/modules/stage/dto/index.ts`

**Interfaces:**
- Produces: player competitor `{ id, name, avatarUrl, teamName?, maps }`.

- [ ] **Step 1: Write failing backend tests**

Добавить `avatarUrl: 'https://a.ppy.sh/42'` в ожидаемую player-row service/schema и mock row с `osuId: 42`.

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter backend test -- --runInBand src/modules/stage/stage-statistics.service.spec.ts src/modules/stage/dto/index.spec.ts
```

Expected: FAIL because service/schema omit `avatarUrl`.

- [ ] **Step 3: Implement minimal backend contract**

Player SQL selects `competitor.osu_id as "osuId"`. Return:

```ts
avatarUrl: `https://a.ppy.sh/${competitor.osuId}`,
```

DTO player row adds:

```ts
avatarUrl: z.url().optional(),
```

- [ ] **Step 4: Verify GREEN**

Run the same Jest command. Expected: PASS.

### Task 2: Profile href behavior

**Files:**
- Modify: `apps/frontend/src/lib/components/multiplayerScore/multiplayerScore.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/multiplayerScore.test.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/playerMultiplayerScore.svelte`
- Modify: `apps/frontend/src/routes/events/[slug]/components/StatisticsTab.svelte`

**Interfaces:**
- Produces: `playerProfileHref(userId?: string | null): string | undefined`.

- [ ] **Step 1: Write failing href unit test**

```ts
expect(playerProfileHref('user-1')).toBe('/users/user-1');
expect(playerProfileHref(null)).toBeUndefined();
```

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter frontend exec bun test src/lib/components/multiplayerScore/multiplayerScore.test.ts
```

Expected: FAIL because helper is missing.

- [ ] **Step 3: Implement helper and UI**

```ts
export const playerProfileHref = (userId?: string | null) =>
  userId ? `/users/${userId}` : undefined;
```

В score-card обернуть avatar/name в `<a>` только при href. В statistics player-row использовать существующие `Avatar`, `AvatarImage`, `AvatarFallback`; ссылка показывается, когда competitor содержит `avatarUrl`.

- [ ] **Step 4: Verify GREEN and Svelte types**

```bash
pnpm --filter frontend exec bun test src/lib/components/multiplayerScore/multiplayerScore.test.ts
pnpm --filter frontend check
```

Expected: PASS.

### Task 3: API generation and final verification

**Files:**
- Modify through generator: `apps/frontend/openapi/backend.json`
- Modify through generator: `apps/frontend/src/lib/api/generated/model/stageStatisticsDtoOutputCompetitorsItem.ts`

- [ ] **Step 1: Refresh OpenAPI and generated model**

Запустить backend, затем:

```bash
pnpm --dir apps/frontend api:refresh
```

Expected: generated competitor type contains optional `avatarUrl`.

- [ ] **Step 2: Run final checks**

```bash
pnpm --filter backend test -- --runInBand src/modules/stage/stage-statistics.service.spec.ts src/modules/stage/dto/index.spec.ts
pnpm --filter backend exec tsc --noEmit
pnpm --filter frontend exec bun test src/lib/components/multiplayerScore/multiplayerScore.test.ts
pnpm --filter frontend check
git diff --check
graphify update .
```

Expected: all checks exit 0 and graphify updates successfully.
