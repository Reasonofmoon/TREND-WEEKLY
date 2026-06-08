const assert = require('node:assert/strict');
const test = require('node:test');
const { FakeSpreadsheet, loadApp } = require('./helpers.cjs');

test('Schema creates weekly app sheets and seed config', () => {
  const ss = new FakeSpreadsheet();
  const context = loadApp(['Main.js', 'Schema.js'], {
    SpreadsheetApp: { openById: () => ss }
  });

  context.initialSetup();

  assert.deepEqual(ss.getSheetByName('WeeklySources').data[0], [
    'collected_at', 'week_key', 'source_type', 'title', 'url', 'summary',
    'published_at', 'author', 'tags', 'score', 'dedupe_key', 'status'
  ]);
  assert.deepEqual(ss.getSheetByName('WeeklyIssueLog').data[0], [
    'week_key', 'issue_number', 'issue_url', 'title', 'published_at', 'status', 'message'
  ]);

  const config = ss.getSheetByName('WeeklyConfig').data;
  assert.ok(config.some((row) => row[0] === 'GITHUB_OWNER' && row[1] === 'Reasonofmoon'));
  assert.ok(config.some((row) => row[0] === 'GITHUB_REPO' && row[1] === 'TREND-WEEKLY'));
});
