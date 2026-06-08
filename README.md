# TREND-WEEKLY

Weekly curation app for publishing a GitHub Issue that summarizes:

- Blog posts
- YouTube videos
- TPT product updates
- Imweb product/news updates
- TREND-NEWS daily newsletter highlights

This is a separate Apps Script project from TREND-NEWS. It publishes one weekly GitHub Issue instead of sending daily email.

## Google Targets

- Sheet ID: `1h_HbL9-xUavM0Yz_RHTV_FD1CcnrSZuMT-OsSAMick8`
- Apps Script ID: `1WWcKc5D_V0NRRXj-023VXtbznFtLuh3ss55quyUw6HRJZ2-WggeWSzeU`
- GitHub repo: `Reasonofmoon/TREND-WEEKLY`

## Required Script Properties

```text
SHEET_ID=1h_HbL9-xUavM0Yz_RHTV_FD1CcnrSZuMT-OsSAMick8
GITHUB_OWNER=Reasonofmoon
GITHUB_REPO=TREND-WEEKLY
GITHUB_TOKEN=<classic or fine-grained token with Issues write permission>
```

Optional source properties can also be set in the `WeeklyConfig` sheet:

```text
BLOG_RSS_URL=
TILNOTE_PROFILE_URL=https://tilnote.io/@reasonofmoon
YOUTUBE_CHANNEL_URL=https://www.youtube.com/@reasonofmoon
YOUTUBE_RSS_URL=
LINKEDIN_SOURCE_URLS=https://www.linkedin.com/in/reasonofmoon/
TPT_SOURCE_URLS=https://www.teacherspayteachers.com/store/moonlight-english-6940
IMWEB_SOURCE_URLS=https://e-teachers.imweb.me/21
TREND_NEWS_SHEET_ID=1xHIJdzOfZ0QPP1hplvcXT-dboH0hCeJYq2vNkGpvbdw
INTERNAL_BLOCKED_TERMS=
```

Use comma-separated URLs for `LINKEDIN_SOURCE_URLS`, `TPT_SOURCE_URLS`, and `IMWEB_SOURCE_URLS`.
Run `configureReasonofmoonSources()` to write the known Reasonofmoon source URLs into `WeeklyConfig`.

## Main Functions

- `initialSetup()` - create sheets and seed default config.
- `installWeeklyTriggers()` - install daily collection and Monday publishing triggers.
- `collectWeeklySources()` - collect candidate items into `WeeklySources`.
- `generateWeeklyDigest()` - generate the current week TOP 10 digest.
- `publishWeeklyGitHubIssue()` - publish the generated digest to GitHub Issues.
- `runWeeklyDigestNow()` - collect, generate, and publish in one run.
- `runHealthCheck()` - validate sheets, config, token presence, and current-week state.

## Local Verification

```powershell
npm test
```
