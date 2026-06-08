/**
 * Builds a weekly TOP 10 GitHub Issue body from WeeklySources.
 */
var WeeklyDigestGenerator_ = (function () {
  function generate() {
    const ss = getSS_();
    const sourceSheet = ss.getSheetByName(SHEET_SOURCES);
    const digestSheet = ss.getSheetByName(SHEET_DIGEST);
    const week = currentWeek_();
    const items = selectTopItems_(readWeekItems_(sourceSheet, week), 10);
    const title = 'Weekly Digest — ' + week.start + ' ~ ' + week.end;
    const body = buildMarkdown_(title, week, items);

    upsertDigest_(digestSheet, {
      weekKey: week.key,
      weekStart: week.start,
      weekEnd: week.end,
      title: title,
      body: body,
      itemCount: items.length,
      status: items.length ? 'ready' : 'empty'
    });

    log_('generateWeeklyDigest week=' + week.key + ' items=' + items.length);
    return { weekKey: week.key, title: title, itemCount: items.length, status: items.length ? 'ready' : 'empty' };
  }

  function readWeekItems_(sheet, week) {
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return [];
    const idx = headerIndex_(rows[0]);
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const rowWeek = rows[i][idx.week_key] || '';
      const published = dateKey_(rows[i][idx.published_at]);
      if (rowWeek !== week.key && (published < week.start || published > week.end)) continue;
      const item = {
        sourceType: rows[i][idx.source_type],
        title: rows[i][idx.title],
        url: rows[i][idx.url],
        summary: rows[i][idx.summary],
        publishedAt: published,
        author: rows[i][idx.author],
        tags: rows[i][idx.tags],
        score: Number(rows[i][idx.score] || 0),
        dedupeKey: rows[i][idx.dedupe_key]
      };
      if (!item.title || !item.url || hasInternalBlockedTerm_(item.title + ' ' + item.summary)) continue;
      out.push(item);
    }
    return out;
  }

  function selectTopItems_(items, limit) {
    const seen = {};
    const unique = [];
    for (let i = 0; i < items.length; i++) {
      const key = items[i].dedupeKey || canonicalUrl_(items[i].url) || fingerprint_(items[i].title);
      if (!key || seen[key]) continue;
      seen[key] = true;
      unique.push(items[i]);
    }

    unique.sort(function (a, b) {
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''));
    });
    return unique.slice(0, limit);
  }

  function buildMarkdown_(title, week, items) {
    const grouped = groupByType_(items);
    const lines = [
      '# ' + title,
      '',
      '> Period: ' + week.start + ' ~ ' + week.end,
      '> Scope: blog, YouTube, TPT, Imweb, and TREND-NEWS daily highlights',
      '',
      '## This Week TOP 10'
    ];

    if (!items.length) {
      lines.push('- No candidates collected for this week yet.');
    } else {
      for (let i = 0; i < items.length; i++) {
        lines.push((i + 1) + '. **[' + labelForType_(items[i].sourceType) + '] [' +
          escapeMd_(items[i].title) + '](' + items[i].url + ')**');
        if (items[i].summary) lines.push('   - ' + escapeMd_(items[i].summary).slice(0, 260));
      }
    }

    appendGroup_(lines, '## My Published Content', grouped.blog, 'Blog');
    appendGroup_(lines, '## YouTube', grouped.youtube, 'YouTube');
    appendGroup_(lines, '## LinkedIn', grouped.linkedin, 'LinkedIn');
    appendGroup_(lines, '## Product Updates', (grouped.tpt || []).concat(grouped.imweb || []), 'Product');
    appendGroup_(lines, '## Daily TREND-NEWS Highlights', grouped['daily-news'], 'Daily News');

    lines.push('');
    lines.push('## Next-Week Content Ideas');
    const ideas = buildIdeas_(items);
    for (let i = 0; i < ideas.length; i++) lines.push('- ' + ideas[i]);

    lines.push('');
    lines.push('## Sources');
    for (let i = 0; i < items.length; i++) {
      lines.push('- [' + labelForType_(items[i].sourceType) + '] ' + escapeMd_(items[i].title) + ' — ' + items[i].url);
    }
    return lines.join('\n');
  }

  function appendGroup_(lines, heading, items, fallbackLabel) {
    lines.push('');
    lines.push(heading);
    if (!items || !items.length) {
      lines.push('- No ' + fallbackLabel + ' item collected this week.');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      lines.push('- [' + escapeMd_(items[i].title) + '](' + items[i].url + ')');
    }
  }

  function buildIdeas_(items) {
    const ideas = [];
    for (let i = 0; i < items.length && ideas.length < 5; i++) {
      ideas.push('Turn "' + escapeMd_(items[i].title).slice(0, 80) + '" into a short post, email note, or product update.');
    }
    if (!ideas.length) ideas.push('Add source URLs in WeeklyConfig, then rerun collectWeeklySources().');
    return ideas;
  }

  function groupByType_(items) {
    const out = {};
    for (let i = 0; i < items.length; i++) {
      const key = items[i].sourceType;
      if (!out[key]) out[key] = [];
      out[key].push(items[i]);
    }
    return out;
  }

  function labelForType_(type) {
    const map = {
      blog: 'Blog',
      youtube: 'YouTube',
      linkedin: 'LinkedIn',
      tpt: 'TPT',
      imweb: 'Imweb',
      'daily-news': 'Daily News'
    };
    return map[type] || 'Source';
  }

  function upsertDigest_(sheet, digest) {
    const rows = sheet.getDataRange().getValues();
    const idx = headerIndex_(rows[0]);
    const row = [
      digest.weekKey, digest.weekStart, digest.weekEnd, digest.title, digest.body,
      digest.itemCount, digest.status, new Date()
    ];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idx.week_key] === digest.weekKey) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        return;
      }
    }
    sheet.appendRow(row);
  }

  function escapeMd_(value) {
    return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  return {
    generate: generate,
    buildMarkdownForTest: buildMarkdown_,
    selectTopItemsForTest: selectTopItems_
  };
})();
