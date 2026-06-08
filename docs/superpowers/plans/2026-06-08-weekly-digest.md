# Weekly Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate Apps Script app that collects weekly sources and publishes a TOP 10 GitHub Issue.

**Architecture:** The app uses Google Sheets as the datastore, Apps Script triggers for scheduling, RSS/static page adapters for collection, a deterministic digest generator, and GitHub REST API issue publishing. The implementation avoids email/subscriber logic from TREND-NEWS.

**Tech Stack:** Google Apps Script, Google Sheets, GitHub REST API, Node.js tests with `node:test`.

---

### Task 1: Project Skeleton

**Files:**
- Create: `.clasp.json`
- Create: `appsscript.json`
- Create: `README.md`
- Create: `docs/superpowers/specs/2026-06-08-weekly-digest-design.md`

- [x] Add Apps Script project metadata for script ID `1WWcKc5D_V0NRRXj-023VXtbznFtLuh3ss55quyUw6HRJZ2-WggeWSzeU`.
- [x] Document required properties and operational functions.
- [x] Document the independent app boundary from TREND-NEWS.

### Task 2: Sheet Schema

**Files:**
- Create: `Main.js`
- Create: `Schema.js`
- Test: `tests/schema.test.cjs`

- [x] Define sheet names and the fixed Sheet ID fallback.
- [x] Create `WeeklyConfig`, `WeeklySources`, `WeeklyDigest`, `WeeklyIssueLog`, and `Logs`.
- [x] Seed GitHub owner/repo and source URL config keys.

### Task 3: Source Collection

**Files:**
- Create: `SourceCollector.js`
- Test: `tests/source-collector.test.cjs`

- [x] Collect RSS entries from configured blog and YouTube URLs.
- [x] Collect static TPT/Imweb product links from config.
- [x] Optionally import TREND-NEWS `DailyIssues` from another Sheet ID.
- [x] Dedupe by canonical URL and title fingerprint.
- [x] Block internal terms.

### Task 4: Weekly Digest Generation

**Files:**
- Create: `WeeklyDigestGenerator.js`
- Test: `tests/weekly-generator.test.cjs`

- [x] Select the current KST week range.
- [x] Rank own content, products, and daily news into TOP 10.
- [x] Build GitHub Issue markdown.
- [x] Store one digest per week.

### Task 5: GitHub Publishing

**Files:**
- Create: `GitHubPublisher.js`
- Test: `tests/github-publisher.test.cjs`

- [x] Publish the latest generated digest to GitHub Issues.
- [x] Add labels `weekly-digest` and `auto-published`.
- [x] Skip publishing if the week already has a sent issue log.
- [x] Log issue number and URL.

### Task 6: Operations

**Files:**
- Create: `HealthCheck.js`
- Modify: `Main.js`
- Test: `tests/main-health.test.cjs`

- [x] Add `initialSetup`, `installWeeklyTriggers`, `runWeeklyDigestNow`, and `runHealthCheck`.
- [x] Validate required sheets and properties.
- [x] Run local tests.
- [x] Push with `clasp push -f`.
