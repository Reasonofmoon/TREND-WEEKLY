/**
 * Sheet schema and seed config.
 */
var Schema_ = (function () {
  function ensureSheets() {
    const ss = getSS_();

    ensureSheet_(ss, SHEET_CONFIG, ['key', 'value', 'note']);
    ensureSheet_(ss, SHEET_SOURCES, [
      'collected_at', 'week_key', 'source_type', 'title', 'url', 'summary',
      'published_at', 'author', 'tags', 'score', 'dedupe_key', 'status'
    ]);
    ensureSheet_(ss, SHEET_DIGEST, [
      'week_key', 'week_start', 'week_end', 'title', 'body_markdown',
      'body_html', 'html_path', 'html_url', 'item_count', 'status', 'created_at'
    ]);
    ensureSheet_(ss, SHEET_ISSUE_LOG, [
      'week_key', 'issue_number', 'issue_url', 'title', 'published_at', 'status', 'message'
    ]);
    ensureSheet_(ss, SHEET_LOGS, ['ts', 'message']);
  }

  function seedConfig() {
    const seeds = [
      ['SHEET_ID', DEFAULT_SHEET_ID, 'Google Sheet backing this weekly app'],
      ['GITHUB_OWNER', 'Reasonofmoon', 'GitHub issue owner'],
      ['GITHUB_REPO', 'TREND-WEEKLY', 'GitHub issue repository'],
      ['GITHUB_PAGES_BASE_URL', 'https://reasonofmoon.github.io/TREND-WEEKLY', 'GitHub Pages base URL for designed weekly HTML pages'],
      ['BLOG_RSS_URL', '', 'Blog RSS feed URL'],
      ['TILNOTE_PROFILE_URL', 'https://tilnote.io/@reasonofmoon', 'Tilnote profile page for recent blog posts'],
      ['YOUTUBE_CHANNEL_URL', 'https://www.youtube.com/@reasonofmoon', 'YouTube channel URL; RSS is resolved automatically when YOUTUBE_RSS_URL is blank'],
      ['YOUTUBE_RSS_URL', '', 'YouTube RSS feed URL; optional override'],
      ['LINKEDIN_SOURCE_URLS', 'https://www.linkedin.com/in/reasonofmoon/', 'Comma-separated LinkedIn profile/post URLs'],
      ['TPT_SOURCE_URLS', 'https://www.teacherspayteachers.com/store/moonlight-english-6940', 'Comma-separated TPT product/news URLs'],
      ['IMWEB_SOURCE_URLS', 'https://e-teachers.imweb.me/21', 'Comma-separated Imweb product/news URLs'],
      ['TREND_NEWS_SHEET_ID', '', 'Optional TREND-NEWS daily newsletter Google Sheet ID'],
      ['INTERNAL_BLOCKED_TERMS', '', 'Comma-separated extra private terms to block']
    ];

    for (let i = 0; i < seeds.length; i++) {
      if (!configExists_(seeds[i][0])) setConfig_(seeds[i][0], seeds[i][1], seeds[i][2]);
    }
  }

  function configExists_(key) {
    const sh = getSS_().getSheetByName(SHEET_CONFIG);
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === key) return true;
    }
    return false;
  }

  function ensureSheet_(ss, name, header) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
      sh.setFrozenRows(1);
    } else {
      ensureHeaderColumns_(sh, header);
    }
  }

  function ensureHeaderColumns_(sh, header) {
    const current = sh.getDataRange().getValues()[0].map(function (h) { return String(h || ''); });
    let changed = false;
    for (let i = 0; i < header.length; i++) {
      if (current.indexOf(header[i]) < 0) {
        current.push(header[i]);
        changed = true;
      }
    }
    if (changed) sh.getRange(1, 1, 1, current.length).setValues([current]).setFontWeight('bold');
  }

  return { ensureSheets: ensureSheets, seedConfig: seedConfig };
})();
