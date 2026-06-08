const assert = require('node:assert/strict');
const test = require('node:test');
const { FakeSheet, FakeSpreadsheet, loadApp } = require('./helpers.cjs');

test('installWeeklyTriggers wires daily collect and Monday publish functions', () => {
  const ss = new FakeSpreadsheet({ Logs: new FakeSheet('Logs', [['ts', 'message']]) });
  const context = loadApp(['Main.js'], {
    SpreadsheetApp: { openById: () => ss }
  });

  context.installWeeklyTriggers();

  const fns = context.ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction());
  assert.deepEqual(fns, ['collectWeeklySources', 'runWeeklyDigestNow', 'runHealthCheck']);
});

test('HealthCheck reports missing GitHub token and source config', () => {
  const ss = new FakeSpreadsheet({
    WeeklyConfig: new FakeSheet('WeeklyConfig', [
      ['key', 'value', 'note'],
      ['GITHUB_OWNER', 'Reasonofmoon', ''],
      ['GITHUB_REPO', 'TREND-WEEKLY', '']
    ]),
    WeeklySources: new FakeSheet('WeeklySources', [['week_key']]),
    WeeklyDigest: new FakeSheet('WeeklyDigest', [['week_key']]),
    WeeklyIssueLog: new FakeSheet('WeeklyIssueLog', [['week_key']]),
    Logs: new FakeSheet('Logs', [['ts', 'message']])
  });
  const context = loadApp(['Main.js', 'HealthCheck.js'], {
    SpreadsheetApp: { openById: () => ss }
  });

  const result = context.runHealthCheck();

  assert.equal(result.ok, false);
  assert.match(result.message, /GitHub config/);
  assert.match(result.message, /token MISSING/);
  assert.match(result.message, /Source config/);
});

test('HealthCheck reports GitHub repo access failures when token is set', () => {
  const ss = new FakeSpreadsheet({
    WeeklyConfig: new FakeSheet('WeeklyConfig', [
      ['key', 'value', 'note'],
      ['GITHUB_OWNER', 'Reasonofmoon', ''],
      ['GITHUB_REPO', 'TREND-WEEKLY', ''],
      ['TILNOTE_PROFILE_URL', 'https://tilnote.io/@reasonofmoon', '']
    ]),
    WeeklySources: new FakeSheet('WeeklySources', [['week_key']]),
    WeeklyDigest: new FakeSheet('WeeklyDigest', [['week_key']]),
    WeeklyIssueLog: new FakeSheet('WeeklyIssueLog', [['week_key']]),
    Logs: new FakeSheet('Logs', [['ts', 'message']])
  });
  const context = loadApp(['Main.js', 'GitHubPublisher.js', 'HealthCheck.js'], {
    props: { GITHUB_TOKEN: 'bad-token' },
    SpreadsheetApp: { openById: () => ss },
    UrlFetchApp: {
      fetch(url) {
        if (url.includes('/contents/')) {
          return {
            getResponseCode: () => 403,
            getContentText: () => '{"message":"Resource not accessible by personal access token"}'
          };
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ has_issues: true, permissions: { push: true, pull: true } })
        };
      }
    }
  });

  const result = context.runHealthCheck();

  assert.equal(result.ok, false);
  assert.match(result.message, /contents permission check 403/);
  assert.match(result.message, /Contents: Read and write/);
});
