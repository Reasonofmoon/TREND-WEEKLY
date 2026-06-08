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
  assert.ok(config.some((row) => row[0] === 'TILNOTE_PROFILE_URL' && row[1] === 'https://tilnote.io/@reasonofmoon'));
  assert.ok(config.some((row) => row[0] === 'YOUTUBE_CHANNEL_URL' && row[1] === 'https://www.youtube.com/@reasonofmoon'));
  assert.ok(config.some((row) => row[0] === 'LINKEDIN_SOURCE_URLS' && row[1] === 'https://www.linkedin.com/in/reasonofmoon/'));
  assert.ok(config.some((row) => row[0] === 'TPT_SOURCE_URLS' && row[1] === 'https://www.teacherspayteachers.com/store/moonlight-english-6940'));
  assert.ok(config.some((row) => row[0] === 'IMWEB_SOURCE_URLS' && row[1] === 'https://e-teachers.imweb.me/21'));
});

test('configureReasonofmoonSources writes known source URLs to config', () => {
  const ss = new FakeSpreadsheet();
  const context = loadApp(['Main.js', 'Schema.js'], {
    SpreadsheetApp: { openById: () => ss }
  });

  context.initialSetup();
  const result = context.configureReasonofmoonSources();

  assert.equal(result.youtube, 'https://www.youtube.com/@reasonofmoon');
  assert.equal(result.tilnote, 'https://tilnote.io/@reasonofmoon');
  assert.equal(result.linkedin, 'https://www.linkedin.com/in/reasonofmoon/');
  assert.equal(result.tpt, 'https://www.teacherspayteachers.com/store/moonlight-english-6940');
  assert.equal(result.imweb, 'https://e-teachers.imweb.me/21');
  assert.equal(result.trendNewsSheetId, '1xHIJdzOfZ0QPP1hplvcXT-dboH0hCeJYq2vNkGpvbdw');
});
