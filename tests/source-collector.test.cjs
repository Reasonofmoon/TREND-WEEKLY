const assert = require('node:assert/strict');
const test = require('node:test');
const { FakeSheet, FakeSpreadsheet, loadApp } = require('./helpers.cjs');

test('SourceCollector normalizes items and blocks internal terms during collect', () => {
  const sources = new FakeSheet('WeeklySources', [
    ['collected_at', 'week_key', 'source_type', 'title', 'url', 'summary', 'published_at', 'author', 'tags', 'score', 'dedupe_key', 'status']
  ]);
  const config = new FakeSheet('WeeklyConfig', [
    ['key', 'value', 'note'],
    ['TPT_SOURCE_URLS', 'https://example.com/public-product,https://example.com/connectedu-product', '']
  ]);
  const ss = new FakeSpreadsheet({ WeeklySources: sources, WeeklyConfig: config, Logs: new FakeSheet('Logs', [['ts', 'message']]) });
  const context = loadApp(['Main.js', 'SourceCollector.js'], {
    SpreadsheetApp: { openById: () => ss },
    UrlFetchApp: {
      fetch(url) {
        return {
          getResponseCode: () => 200,
          getContentText: () => url.includes('connectedu')
            ? '<html><title>ConnectEdu internal product</title></html>'
            : '<html><title>Public TPT Product</title><meta name="description" content="Useful public classroom resource"></html>'
        };
      }
    }
  });

  const result = context.SourceCollector_.collect();

  assert.equal(result.added, 1);
  assert.equal(result.skippedBlocked, 1);
  assert.equal(sources.data[1][2], 'tpt');
  assert.equal(sources.data[1][3], 'Public TPT Product');
});
