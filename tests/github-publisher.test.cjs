const assert = require('node:assert/strict');
const test = require('node:test');
const { FakeSheet, FakeSpreadsheet, loadApp } = require('./helpers.cjs');

test('GitHubPublisher creates one issue and logs it', () => {
  const digest = new FakeSheet('WeeklyDigest', [
    ['week_key', 'week_start', 'week_end', 'title', 'body_markdown', 'item_count', 'status', 'created_at'],
    ['2026-06-08_2026-06-14', '2026-06-08', '2026-06-14', 'Weekly Digest — 2026-06-08 ~ 2026-06-14', '# Body', 3, 'ready', '']
  ]);
  const issueLog = new FakeSheet('WeeklyIssueLog', [
    ['week_key', 'issue_number', 'issue_url', 'title', 'published_at', 'status', 'message']
  ]);
  const config = new FakeSheet('WeeklyConfig', [
    ['key', 'value', 'note'],
    ['GITHUB_OWNER', 'Reasonofmoon', ''],
    ['GITHUB_REPO', 'TREND-WEEKLY', '']
  ]);
  const ss = new FakeSpreadsheet({ WeeklyDigest: digest, WeeklyIssueLog: issueLog, WeeklyConfig: config, Logs: new FakeSheet('Logs', [['ts', 'message']]) });
  const calls = [];
  const context = loadApp(['Main.js', 'GitHubPublisher.js'], {
    props: { GITHUB_TOKEN: 'ghp_test' },
    SpreadsheetApp: { openById: () => ss },
    UrlFetchApp: {
      fetch(url, options) {
        calls.push({ url, options });
        return {
          getResponseCode: () => 201,
          getContentText: () => JSON.stringify({ number: 7, html_url: 'https://github.com/Reasonofmoon/TREND-WEEKLY/issues/7' })
        };
      }
    }
  });

  const result = context.GitHubPublisher_.publishLatest();

  assert.equal(result.status, 'sent');
  assert.equal(issueLog.data[1][1], 7);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/Reasonofmoon/TREND-WEEKLY/issues');
  const payload = JSON.parse(calls[0].options.payload);
  assert.deepEqual(payload.labels, ['weekly-digest', 'auto-published']);
});

test('GitHubPublisher skips already published week', () => {
  const digest = new FakeSheet('WeeklyDigest', [
    ['week_key', 'week_start', 'week_end', 'title', 'body_markdown', 'item_count', 'status', 'created_at'],
    ['2026-06-08_2026-06-14', '2026-06-08', '2026-06-14', 'Weekly Digest', '# Body', 1, 'ready', '']
  ]);
  const issueLog = new FakeSheet('WeeklyIssueLog', [
    ['week_key', 'issue_number', 'issue_url', 'title', 'published_at', 'status', 'message'],
    ['2026-06-08_2026-06-14', 7, 'https://github.com/Reasonofmoon/TREND-WEEKLY/issues/7', 'Weekly Digest', '', 'sent', '']
  ]);
  const ss = new FakeSpreadsheet({ WeeklyDigest: digest, WeeklyIssueLog: issueLog, WeeklyConfig: new FakeSheet('WeeklyConfig', [['key', 'value', 'note']]), Logs: new FakeSheet('Logs', [['ts', 'message']]) });
  const context = loadApp(['Main.js', 'GitHubPublisher.js'], {
    SpreadsheetApp: { openById: () => ss },
    UrlFetchApp: { fetch: () => assert.fail('should not call GitHub') }
  });

  const result = context.GitHubPublisher_.publishLatest();

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'already_published');
});
