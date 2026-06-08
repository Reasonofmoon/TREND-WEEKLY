/**
 * Publishes generated weekly digest to GitHub Issues.
 */
var GitHubPublisher_ = (function () {
  function publishLatest() {
    const ss = getSS_();
    const week = currentWeek_();
    const logSheet = ss.getSheetByName(SHEET_ISSUE_LOG);

    const existing = findPublishedIssue_(logSheet, week.key);
    if (existing) {
      log_('publishWeeklyGitHubIssue skipped: already published ' + existing.issueUrl);
      return { status: 'skipped', reason: 'already_published', issueUrl: existing.issueUrl };
    }

    const digest = findDigest_(ss.getSheetByName(SHEET_DIGEST), week.key);
    if (!digest || digest.status !== 'ready') {
      const reason = digest ? 'digest_not_ready' : 'missing_digest';
      log_('publishWeeklyGitHubIssue skipped: ' + reason);
      return { status: 'skipped', reason: reason };
    }

    const result = createIssue_(digest.title, digest.body);
    logSheet.appendRow([
      week.key, result.number, result.htmlUrl, digest.title, new Date(), 'sent', ''
    ]);
    log_('publishWeeklyGitHubIssue sent issue #' + result.number + ' ' + result.htmlUrl);
    return { status: 'sent', issueNumber: result.number, issueUrl: result.htmlUrl };
  }

  function findDigest_(sheet, weekKey) {
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return null;
    const idx = headerIndex_(rows[0]);
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][idx.week_key] === weekKey) {
        return {
          title: rows[i][idx.title],
          body: rows[i][idx.body_markdown],
          itemCount: rows[i][idx.item_count],
          status: rows[i][idx.status]
        };
      }
    }
    return null;
  }

  function findPublishedIssue_(sheet, weekKey) {
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return null;
    const idx = headerIndex_(rows[0]);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idx.week_key] === weekKey && rows[i][idx.status] === 'sent') {
        return { issueNumber: rows[i][idx.issue_number], issueUrl: rows[i][idx.issue_url] };
      }
    }
    return null;
  }

  function createIssue_(title, body) {
    const owner = getConfig_('GITHUB_OWNER', 'Reasonofmoon');
    const repo = getConfig_('GITHUB_REPO', 'TREND-WEEKLY');
    const token = getProp_('GITHUB_TOKEN') || getConfig_('GITHUB_TOKEN');
    if (!token) throw new Error('GITHUB_TOKEN is not set in Script Properties.');

    const url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' +
      encodeURIComponent(repo) + '/issues';
    const payload = {
      title: title,
      body: body,
      labels: ['weekly-digest', 'auto-published']
    };

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) throw githubApiError_('issue API', code, text, owner, repo);
    const bodyJson = JSON.parse(text);
    return { number: bodyJson.number, htmlUrl: bodyJson.html_url };
  }

  function checkAccess() {
    const owner = getConfig_('GITHUB_OWNER', 'Reasonofmoon');
    const repo = getConfig_('GITHUB_REPO', 'TREND-WEEKLY');
    const token = getProp_('GITHUB_TOKEN') || getConfig_('GITHUB_TOKEN');
    if (!token) return { ok: false, detail: 'GITHUB_TOKEN is missing' };

    const url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo);
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) {
      return { ok: false, detail: githubApiError_('repo access check', code, text, owner, repo).message };
    }

    const body = JSON.parse(text);
    const issuesEnabled = body.has_issues !== false;
    const permissions = body.permissions || {};
    const canWrite = permissions.push || permissions.admin || permissions.maintain || permissions.triage;
    return {
      ok: issuesEnabled && canWrite,
      detail: owner + '/' + repo +
        ', issues=' + (issuesEnabled ? 'enabled' : 'DISABLED') +
        ', permissions=' + JSON.stringify(permissions)
    };
  }

  function githubApiError_(area, code, text, owner, repo) {
    let hint = '';
    if (code === 404) {
      hint = ' Hint: GitHub returns 404 when the repo is private or the token cannot access it. Check GITHUB_OWNER/GITHUB_REPO, enable Issues, and give GITHUB_TOKEN access to ' + owner + '/' + repo + ' with Issues: Read and write.';
    } else if (code === 401 || code === 403) {
      hint = ' Hint: Check whether GITHUB_TOKEN is valid and has Issues: Read and write permission for ' + owner + '/' + repo + '.';
    } else if (code === 410) {
      hint = ' Hint: GitHub Issues may be disabled for ' + owner + '/' + repo + '.';
    }
    return new Error('GitHub ' + area + ' ' + code + ': ' + text + hint);
  }

  return {
    publishLatest: publishLatest,
    checkAccess: checkAccess,
    createIssueForTest: createIssue_
  };
})();
