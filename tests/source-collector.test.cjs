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

test('SourceCollector resolves YouTube channel URL into RSS feed', () => {
  const sources = new FakeSheet('WeeklySources', [
    ['collected_at', 'week_key', 'source_type', 'title', 'url', 'summary', 'published_at', 'author', 'tags', 'score', 'dedupe_key', 'status']
  ]);
  const config = new FakeSheet('WeeklyConfig', [
    ['key', 'value', 'note'],
    ['YOUTUBE_CHANNEL_URL', 'https://www.youtube.com/@reasonofmoon', '']
  ]);
  const ss = new FakeSpreadsheet({ WeeklySources: sources, WeeklyConfig: config, Logs: new FakeSheet('Logs', [['ts', 'message']]) });
  const calls = [];
  const context = loadApp(['Main.js', 'SourceCollector.js'], {
    SpreadsheetApp: { openById: () => ss },
    UrlFetchApp: {
      fetch(url) {
        calls.push(url);
        if (url === 'https://www.youtube.com/@reasonofmoon') {
          return {
            getResponseCode: () => 200,
            getContentText: () => '{"channelId":"UC_TEST_REASON"}'
          };
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<feed xmlns="http://www.w3.org/2005/Atom">',
            '<entry><title>Weekly video</title><link href="https://www.youtube.com/watch?v=abc"/><published>2026-06-08T00:00:00Z</published><summary>Video summary</summary></entry>',
            '</feed>'
          ].join('')
        };
      }
    },
    XmlService: {
      parse() {
        return {
          getRootElement() {
            const ns = {};
            return {
              getNamespace: () => ns,
              getChild: () => null,
              getChildren: () => [{
                getChild(name) {
                  return {
                    getText: () => name === 'title' ? 'Weekly video' : name === 'published' ? '2026-06-08T00:00:00Z' : 'Video summary'
                  };
                },
                getChildren() {
                  return [{ getAttribute: () => ({ getValue: () => 'https://www.youtube.com/watch?v=abc' }) }];
                }
              }]
            };
          }
        };
      }
    }
  });

  const result = context.SourceCollector_.collect();

  assert.equal(result.added, 1);
  assert.equal(sources.data[1][2], 'youtube');
  assert.ok(calls.includes('https://www.youtube.com/feeds/videos.xml?channel_id=UC_TEST_REASON'));
});

test('SourceCollector parses recent Tilnote posts from profile HTML', () => {
  const context = loadApp(['Main.js', 'SourceCollector.js'], {
    SpreadsheetApp: { openById: () => new FakeSpreadsheet({ WeeklyConfig: new FakeSheet('WeeklyConfig', [['key', 'value', 'note']]) }) }
  });

  const html = '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({
    props: {
      pageProps: {
        ssrData: {
          pages: [
            {
              _id: 'abc123',
              title: 'Tilnote weekly post',
              content: '<p>Useful AI education note.</p>',
              createdAt: '2026-06-08',
              tags: ['AI', '교육'],
              userId: { name: '달의이성' }
            }
          ]
        }
      }
    }
  }) + '</script>';

  const posts = context.SourceCollector_.parseTilnoteProfileForTest(html);

  assert.equal(posts.length, 1);
  assert.equal(posts[0].sourceType, 'blog');
  assert.equal(posts[0].title, 'Tilnote weekly post');
  assert.equal(posts[0].url, 'https://tilnote.io/pages/abc123');
  assert.match(posts[0].summary, /Useful AI education note/);
  assert.equal(posts[0].publishedAt, '2026-06-08');
});
