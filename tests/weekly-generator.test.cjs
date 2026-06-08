const assert = require('node:assert/strict');
const test = require('node:test');
const { FakeSheet, FakeSpreadsheet, loadApp } = require('./helpers.cjs');

test('WeeklyDigestGenerator selects top 10 and groups issue markdown', () => {
  const sources = new FakeSheet('WeeklySources', [
    ['collected_at', 'week_key', 'source_type', 'title', 'url', 'summary', 'published_at', 'author', 'tags', 'score', 'dedupe_key', 'status'],
    ['', '2026-06-08_2026-06-14', 'daily-news', 'Daily low', 'https://example.com/daily', 'Daily summary', '2026-06-08', '', '', 65, 'daily', 'candidate'],
    ['', '2026-06-08_2026-06-14', 'blog', 'Blog high', 'https://example.com/blog', 'Blog summary', '2026-06-08', '', '', 90, 'https://example.com/blog', 'candidate'],
    ['', '2026-06-08_2026-06-14', 'youtube', 'Video high', 'https://example.com/video', 'Video summary', '2026-06-08', '', '', 85, 'video', 'candidate'],
    ['', '2026-06-08_2026-06-14', 'blog', 'Duplicate Blog', 'https://example.com/blog?utm=x', 'Duplicate', '2026-06-08', '', '', 90, 'https://example.com/blog', 'candidate']
  ]);
  const digest = new FakeSheet('WeeklyDigest', [
    ['week_key', 'week_start', 'week_end', 'title', 'body_markdown', 'item_count', 'status', 'created_at']
  ]);
  const ss = new FakeSpreadsheet({ WeeklySources: sources, WeeklyDigest: digest, Logs: new FakeSheet('Logs', [['ts', 'message']]) });
  const context = loadApp(['Main.js', 'WeeklyDigestGenerator.js'], {
    SpreadsheetApp: { openById: () => ss }
  });

  const result = context.WeeklyDigestGenerator_.generate();

  assert.equal(result.weekKey, '2026-06-08_2026-06-14');
  assert.equal(result.itemCount, 3);
  assert.equal(digest.data[1][6], 'ready');
  assert.match(digest.data[1][4], /## This Week TOP 10/);
  assert.match(digest.data[1][4], /\[Blog\]/);
  assert.ok(digest.data[1][4].indexOf('Blog high') < digest.data[1][4].indexOf('Video high'));
});
