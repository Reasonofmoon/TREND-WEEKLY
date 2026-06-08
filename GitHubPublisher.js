/**
 * Publishes generated weekly digest to GitHub Issues.
 */
var GitHubPublisher_ = (function () {
  function publishLatest() {
    const ss = getSS_();
    const week = currentWeek_();
    const logSheet = ss.getSheetByName(SHEET_ISSUE_LOG);

    const existing = findPublishedIssue_(logSheet, week.key);
    const digest = findDigest_(ss.getSheetByName(SHEET_DIGEST), week.key);
    if (!digest || digest.status !== 'ready') {
      const reason = digest ? 'digest_not_ready' : 'missing_digest';
      log_('publishWeeklyGitHubIssue skipped: ' + reason);
      return { status: 'skipped', reason: reason };
    }

    if (existing && !digest.bodyHtml) {
      log_('publishWeeklyGitHubIssue skipped: already published ' + existing.issueUrl);
      return { status: 'skipped', reason: 'already_published', issueUrl: existing.issueUrl };
    }

    const page = publishHtmlPage_(digest);
    const issueBody = buildIssueBody_(digest, page);

    if (existing) {
      const updated = updateIssue_(existing.issueNumber, digest.title, issueBody);
      log_('publishWeeklyGitHubIssue updated issue #' + existing.issueNumber + ' ' + updated.htmlUrl);
      return { status: 'updated', issueNumber: existing.issueNumber, issueUrl: updated.htmlUrl, pageUrl: page && page.htmlUrl };
    }

    const result = createIssue_(digest.title, issueBody);
    logSheet.appendRow([
      week.key, result.number, result.htmlUrl, digest.title, new Date(), 'sent', page && page.htmlUrl ? page.htmlUrl : ''
    ]);
    log_('publishWeeklyGitHubIssue sent issue #' + result.number + ' ' + result.htmlUrl);
    return { status: 'sent', issueNumber: result.number, issueUrl: result.htmlUrl, pageUrl: page && page.htmlUrl };
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
          bodyHtml: idx.body_html != null ? rows[i][idx.body_html] : '',
          htmlPath: idx.html_path != null ? rows[i][idx.html_path] : '',
          htmlUrl: idx.html_url != null ? rows[i][idx.html_url] : '',
          itemCount: rows[i][idx.item_count],
          status: rows[i][idx.status]
        };
      }
    }
    return null;
  }

  function publishHtmlPage_(digest) {
    if (!digest.bodyHtml || !digest.htmlPath) return null;
    const owner = getConfig_('GITHUB_OWNER', 'Reasonofmoon');
    const repo = getConfig_('GITHUB_REPO', 'TREND-WEEKLY');
    const token = getProp_('GITHUB_TOKEN') || getConfig_('GITHUB_TOKEN');
    const path = digest.htmlPath;
    const url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' +
      encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    const existing = getContentSha_(url, token, owner, repo);
    const payload = {
      message: 'Publish weekly digest HTML ' + digest.title,
      content: Utilities.base64Encode(Utilities.newBlob(digest.bodyHtml, 'text/html', 'weekly.html').getBytes()),
      branch: 'main'
    };
    if (existing.sha) payload.sha = existing.sha;

    const res = UrlFetchApp.fetch(url, {
      method: 'put',
      contentType: 'application/json',
      headers: githubHeaders_(token),
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) throw githubApiError_('contents API', code, text, owner, repo);
    return { path: path, htmlUrl: digest.htmlUrl };
  }

  function getContentSha_(url, token, owner, repo) {
    const res = UrlFetchApp.fetch(url + '?ref=main', {
      method: 'get',
      headers: githubHeaders_(token),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code === 404) return {};
    const text = res.getContentText();
    if (code < 200 || code >= 300) throw githubApiError_('contents lookup', code, text, owner, repo);
    const body = JSON.parse(text);
    return { sha: body.sha };
  }

  function buildIssueBody_(digest, page) {
    const lines = [];
    if (page && page.htmlUrl) {
      lines.push('## Moonlit HTML edition');
      lines.push('');
      lines.push('[Open the designed weekly page](' + page.htmlUrl + ')');
      lines.push('');
      lines.push('> If the page is not visible yet, enable GitHub Pages for this repository using `main` / `docs` as the source.');
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    lines.push(digest.body || '');
    return lines.join('\n');
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
      headers: githubHeaders_(token),
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) throw githubApiError_('issue API', code, text, owner, repo);
    const bodyJson = JSON.parse(text);
    return { number: bodyJson.number, htmlUrl: bodyJson.html_url };
  }

  function updateIssue_(issueNumber, title, body) {
    const owner = getConfig_('GITHUB_OWNER', 'Reasonofmoon');
    const repo = getConfig_('GITHUB_REPO', 'TREND-WEEKLY');
    const token = getProp_('GITHUB_TOKEN') || getConfig_('GITHUB_TOKEN');
    const url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' +
      encodeURIComponent(repo) + '/issues/' + encodeURIComponent(issueNumber);
    const res = UrlFetchApp.fetch(url, {
      method: 'patch',
      contentType: 'application/json',
      headers: githubHeaders_(token),
      payload: JSON.stringify({ title: title, body: body }),
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) throw githubApiError_('issue update API', code, text, owner, repo);
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
      headers: githubHeaders_(token),
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

  function githubHeaders_(token) {
    return {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function githubApiError_(area, code, text, owner, repo) {
    let hint = '';
    if (code === 404) {
      hint = ' Hint: GitHub returns 404 when the repo is private or the token cannot access it. Check GITHUB_OWNER/GITHUB_REPO, enable Issues, and give GITHUB_TOKEN access to ' + owner + '/' + repo + ' with Issues: Read and write and Contents: Read and write.';
    } else if (code === 401 || code === 403) {
      hint = ' Hint: Check whether GITHUB_TOKEN is valid and has Issues: Read and write plus Contents: Read and write permission for ' + owner + '/' + repo + '.';
    } else if (code === 410) {
      hint = ' Hint: GitHub Issues may be disabled for ' + owner + '/' + repo + '.';
    }
    return new Error('GitHub ' + area + ' ' + code + ': ' + text + hint);
  }

  return {
    publishLatest: publishLatest,
    checkAccess: checkAccess,
    createIssueForTest: createIssue_,
    buildIssueBodyForTest: buildIssueBody_
  };
})();
