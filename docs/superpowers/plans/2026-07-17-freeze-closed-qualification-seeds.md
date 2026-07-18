# Freeze Closed Qualification Seeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve qualification seeds after all lobbies close while retaining automatic calculation during active synchronization.

**Architecture:** Invalidation marks results stale with nullable `calculatedAt` instead of deleting them. The scheduler processes only stages that had active due rooms in the current tick, including the final tick where synchronization changes a room to completed.

**Tech Stack:** NestJS scheduler, Drizzle ORM/PostgreSQL, Jest.

## Global Constraints

- Generate SQL, journal, and snapshot only through Drizzle Kit CLI.
- Never erase valid results before replacement data is available.
- Do not modify the unrelated pending frontend drag changes.

### Task 1: Preserve invalidated results

- [ ] Add failing repository tests proving invalidation updates `calculatedAt` to null and incomplete recalculation preserves rows.
- [ ] Make `calculatedAt` nullable and change invalidation from delete to update.
- [ ] Generate the migration with Drizzle Kit CLI.
- [ ] Pass focused repository and migration-journal tests.

### Task 2: Freeze closed stages

- [ ] Add scheduler tests proving closed-only stages are skipped and an active room's final sync still triggers recalculation.
- [ ] Restrict stale checks to stages with due active rooms successfully processed in the current tick.
- [ ] Pass scheduler tests.

### Task 3: Verify

- [ ] Run backend tests excluding the two database suites unavailable without local PostgreSQL.
- [ ] Run backend build and `git diff --check`.
- [ ] Run `graphify update .`.
