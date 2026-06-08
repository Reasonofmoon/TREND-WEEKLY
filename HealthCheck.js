/**
 * Operational checks for TREND-WEEKLY.
 */
var HealthCheck_ = (function () {
  function run() {
    const checks = [
      checkSheets_(),
      checkGitHubConfig_(),
      checkSourceConfig_(),
      checkWeeklyState_(),
      checkTriggers_()
    ];
    const ok = checks.every(function (c) { return c.ok; });
    const lines = checks.map(function (c) {
      return (c.ok ? '✓ ' : '✗ ') + c.name + ' — ' + c.detail;
    });
    const message = 'Health check: ' + (ok ? '[PASS]' : '[FAIL ' + checks.filter(function (c) { return !c.ok; }).length + ']') +
      ' TREND-WEEKLY · ' + today_() + '\n' + lines.join('\n');
    log_(message);
    return { ok: ok, checks: checks, message: message };
  }

  function checkSheets_() {
    const ss = getSS_();
    const required = [SHEET_CONFIG, SHEET_SOURCES, SHEET_DIGEST, SHEET_ISSUE_LOG, SHEET_LOGS];
    const missing = [];
    for (let i = 0; i < required.length; i++) {
      if (!ss.getSheetByName(required[i])) missing.push(required[i]);
    }
    return {
      name: 'Sheets present',
      ok: missing.length === 0,
      detail: missing.length ? 'missing: ' + missing.join(', ') : 'all 5 sheets exist'
    };
  }

  function checkGitHubConfig_() {
    const owner = getConfig_('GITHUB_OWNER', 'Reasonofmoon');
    const repo = getConfig_('GITHUB_REPO', 'TREND-WEEKLY');
    const token = getProp_('GITHUB_TOKEN') || getConfig_('GITHUB_TOKEN');
    return {
      name: 'GitHub config',
      ok: !!owner && !!repo && !!token,
      detail: owner + '/' + repo + ', token ' + (token ? 'set' : 'MISSING')
    };
  }

  function checkSourceConfig_() {
    const keys = ['BLOG_RSS_URL', 'YOUTUBE_RSS_URL', 'TPT_SOURCE_URLS', 'IMWEB_SOURCE_URLS', 'TREND_NEWS_SHEET_ID'];
    let count = 0;
    for (let i = 0; i < keys.length; i++) {
      if (getConfig_(keys[i])) count++;
    }
    return {
      name: 'Source config',
      ok: count > 0,
      detail: count + ' configured source groups'
    };
  }

  function checkWeeklyState_() {
    const week = currentWeek_();
    const ss = getSS_();
    const sources = ss.getSheetByName(SHEET_SOURCES).getDataRange().getValues();
    const digests = ss.getSheetByName(SHEET_DIGEST).getDataRange().getValues();
    const sourceCount = countRowsForWeek_(sources, 'week_key', week.key);
    const digestCount = countRowsForWeek_(digests, 'week_key', week.key);
    return {
      name: 'Current week state',
      ok: sourceCount > 0 || digestCount > 0,
      detail: 'week=' + week.key + ', sources=' + sourceCount + ', digests=' + digestCount
    };
  }

  function checkTriggers_() {
    const triggers = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    const required = ['collectWeeklySources', 'runWeeklyDigestNow', 'runHealthCheck'];
    const missing = [];
    for (let i = 0; i < required.length; i++) {
      if (triggers.indexOf(required[i]) < 0) missing.push(required[i]);
    }
    return {
      name: 'Triggers installed',
      ok: missing.length === 0,
      detail: missing.length ? 'missing: ' + missing.join(', ') : 'daily collect + Monday publish wired'
    };
  }

  function countRowsForWeek_(rows, headerName, weekKey) {
    if (rows.length < 2) return 0;
    const idx = headerIndex_(rows[0])[headerName];
    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idx] === weekKey) count++;
    }
    return count;
  }

  return { run: run };
})();
