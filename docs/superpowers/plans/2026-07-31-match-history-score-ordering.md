# Match History Score Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort every match-history game by map result and color every winning score card.

**Architecture:** The existing backend score utility owns per-map team totals,
ordering, and winner flags; `MatchHistoryService` only orchestrates it. The
shared frontend score card maps the returned `team` and `highlighted` fields to
CSS classes.

**Tech Stack:** NestJS, TypeScript, Jest, Svelte 5, Bun, Tailwind CSS

## Global Constraints

- Solo players sort by score descending and every highest-scoring tie is highlighted.
- Teams sort by summed score descending; players within a team sort by score descending.
- Every team tied for the highest total is highlighted.
- Red winners use red styling, blue winners use blue styling, and solo winners use primary styling.
- Game order and overall match winner remain unchanged.
- Add no dependencies or deployment tests.

---

### Task 1: Derive per-map ordering and winners

**Files:**

- Modify: `apps/backend/src/modules/match/match-history.service.ts`
- Modify: `apps/backend/src/modules/match/score.ts`
- Test: `apps/backend/src/modules/match/match-history.service.spec.ts`

**Interfaces:**

- Consumes: synchronized game scores with `team`, `score`, `userId`, and match team IDs.
- Produces: `orderMatchHistoryScores`, returning the existing match-history
  score DTO array ordered and carrying `highlighted`.

- [ ] **Step 1: Write failing service tests**

Add team scores whose individual ordering conflicts with team-total ordering, then assert:

```ts
expect(history.games[0].scores.map(({ userName }) => userName)).toEqual([
  "Red high",
  "Red low",
  "Blue high",
  "Blue low",
]);
expect(history.games[0].scores.map(({ highlighted }) => highlighted)).toEqual([
  true,
  true,
  false,
  false,
]);
```

Add a solo game with a tied high score, then assert descending order and:

```ts
expect(history.games[0].scores.map(({ highlighted }) => highlighted)).toEqual([
  true,
  true,
  false,
]);
```

Add equal team totals and assert every red and blue score is highlighted.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm --filter backend test -- match-history.service.spec.ts --runInBand
```

Expected: FAIL because scores retain room order and highlighting follows the overall match winner.

- [ ] **Step 3: Implement the minimum score utility**

In `score.ts`, export `orderMatchHistoryScores` and calculate totals once:

```ts
const totals = { red: 0, blue: 0 };
for (const score of scores) {
  if (score.team) totals[score.team] += score.score;
}
```

For a team match, compare team totals first and personal scores second. For a
solo match, compare personal scores only. Mark every score equal to the solo
maximum, or belonging to a team whose total equals the team maximum.
`MatchHistoryService` passes synchronized scores and optional team IDs to this
utility.

- [ ] **Step 4: Run the focused backend test**

Run:

```bash
pnpm --filter backend test -- match-history.service.spec.ts --runInBand
```

Expected: PASS.

---

### Task 2: Color highlighted score cards

**Files:**

- Modify: `apps/frontend/src/lib/components/multiplayerScore/multiplayerScore.ts`
- Modify: `apps/frontend/src/lib/components/multiplayerScore/playerMultiplayerScore.svelte`

**Interfaces:**

- Consumes: `PlayerMultiplayerScoreData.team` and `.highlighted`.
- Produces: red, blue, primary, or neutral score-card classes.

- [ ] **Step 1: Add the team field and inline color selection**

Add `team?: 'red' | 'blue' | null` to `PlayerMultiplayerScoreData`. In
`playerMultiplayerScore.svelte`, select `border-red-500 bg-red-500/10`,
`border-blue-500 bg-blue-500/10`, `border-primary bg-primary/10`, or the
existing neutral classes directly. Focused search-result styling keeps priority.

- [ ] **Step 2: Run frontend tests and checks**

Run:

```bash
pnpm --filter frontend exec bun test src/lib/components/multiplayerScore/multiplayerScore.test.ts
pnpm --filter frontend check
```

Expected: PASS.

- [ ] **Step 3: Verify the complete change**

Run:

```bash
pnpm --filter backend test -- match-history.service.spec.ts --runInBand
pnpm --filter frontend exec bun test src/lib/components/multiplayerScore/multiplayerScore.test.ts
pnpm --filter frontend check
graphify update .
git diff --check
```

Expected: all commands exit successfully.
