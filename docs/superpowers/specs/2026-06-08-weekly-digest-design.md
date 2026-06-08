# Weekly Digest GitHub Issue Design

## Goal

Build a separate Apps Script app, `TREND-WEEKLY`, that publishes one weekly GitHub Issue containing the top 10 curated items from the user's own blog, YouTube, TPT, Imweb, and daily TREND-NEWS output.

## Boundaries

This app is independent from TREND-NEWS. It does not send email and does not manage subscribers. It writes to its own Google Sheet and publishes only to `Reasonofmoon/TREND-WEEKLY` Issues.

## Data Model

- `WeeklyConfig`: key/value settings for source URLs and GitHub target.
- `WeeklySources`: collected weekly candidates with URL, title, source type, summary, published date, and dedupe key.
- `WeeklyDigest`: generated digest for a week, including title, markdown body, item count, and status.
- `WeeklyIssueLog`: published issue URL/number per week to prevent duplicate issues.
- `Logs`: timestamped operational logs.

## Flow

1. Daily trigger collects source candidates.
2. Weekly Monday trigger collects again, generates the digest, and publishes the GitHub Issue.
3. The generator dedupes by canonical URL and title fingerprint.
4. The publisher skips a week if `WeeklyIssueLog` already has a sent issue for that week.

## Issue Format

The issue title is `Weekly Digest — YYYY-MM-DD ~ YYYY-MM-DD`.

The issue body contains:

- This week TOP 10
- My published content
- Product updates
- Daily TREND-NEWS highlights
- Next-week content ideas
- Source list

## Safety

Internal product/company names are blocked by default:

- `ConnectEdu`
- `Connect Edu`
- `BookTalk`
- `Book Talk`
- `News Carrier EDU`

Additional blocked terms can be configured with `INTERNAL_BLOCKED_TERMS`.

## Operations

Required properties:

- `SHEET_ID`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`

The configured Sheet ID is `1h_HbL9-xUavM0Yz_RHTV_FD1CcnrSZuMT-OsSAMick8`.
The configured Script ID is `1WWcKc5D_V0NRRXj-023VXtbznFtLuh3ss55quyUw6HRJZ2-WggeWSzeU`.
