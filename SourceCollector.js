/**
 * Collects weekly candidate items from configured sources.
 */
var SourceCollector_ = (function () {
  function collect() {
    const ss = getSS_();
    const sh = ss.getSheetByName(SHEET_SOURCES);
    const week = currentWeek_();
    const seen = buildSeen_(sh);
    const candidates = []
      .concat(fetchRssSource_('blog', getConfig_('BLOG_RSS_URL')))
      .concat(fetchTilnote_())
      .concat(fetchYouTube_())
      .concat(fetchStaticLinks_('linkedin', getConfig_('LINKEDIN_SOURCE_URLS')))
      .concat(fetchStaticLinks_('tpt', getConfig_('TPT_SOURCE_URLS')))
      .concat(fetchStaticLinks_('imweb', getConfig_('IMWEB_SOURCE_URLS')))
      .concat(fetchTrendNewsHighlights_());

    let added = 0, skippedDuplicate = 0, skippedBlocked = 0, scanned = 0;
    for (let i = 0; i < candidates.length; i++) {
      const item = normalizeItem_(candidates[i], week);
      if (!item.title || !item.url) continue;
      scanned++;

      const text = item.title + ' ' + item.summary + ' ' + item.url;
      if (hasInternalBlockedTerm_(text)) {
        skippedBlocked++;
        continue;
      }

      if (seen[item.dedupeKey]) {
        skippedDuplicate++;
        continue;
      }

      appendSource_(sh, item);
      seen[item.dedupeKey] = true;
      added++;
    }

    log_('collectWeeklySources scanned=' + scanned +
         ' added=' + added +
         ' skippedDuplicate=' + skippedDuplicate +
         ' skippedBlocked=' + skippedBlocked);
    return { scanned: scanned, added: added, skippedDuplicate: skippedDuplicate, skippedBlocked: skippedBlocked };
  }

  function fetchRssSource_(sourceType, url) {
    if (!url) return [];
    try {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() !== 200) {
        log_('RSS fetch failed ' + sourceType + ' ' + res.getResponseCode() + ': ' + url);
        return [];
      }
      return parseRssItems_(sourceType, res.getContentText());
    } catch (e) {
      log_('RSS fetch error ' + sourceType + ': ' + e);
      return [];
    }
  }

  function fetchYouTube_() {
    const rssUrl = getConfig_('YOUTUBE_RSS_URL');
    if (rssUrl) return fetchRssSource_('youtube', rssUrl);

    const channelUrl = getConfig_('YOUTUBE_CHANNEL_URL');
    if (!channelUrl) return [];
    const resolved = resolveYouTubeRssUrl_(channelUrl);
    if (!resolved) {
      return [{
        sourceType: 'youtube',
        title: 'Reasonofmoon YouTube channel',
        url: channelUrl,
        summary: 'YouTube channel source is configured, but the RSS channel ID could not be resolved automatically.',
        publishedAt: today_()
      }];
    }
    return fetchRssSource_('youtube', resolved);
  }

  function fetchTilnote_() {
    const profileUrl = getConfig_('TILNOTE_PROFILE_URL');
    if (!profileUrl) return [];
    try {
      const res = UrlFetchApp.fetch(profileUrl, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() < 200 || res.getResponseCode() >= 400) {
        log_('Tilnote fetch failed ' + res.getResponseCode() + ': ' + profileUrl);
        return [];
      }
      return parseTilnoteProfile_(res.getContentText());
    } catch (e) {
      log_('Tilnote fetch error: ' + e);
      return [];
    }
  }

  function parseTilnoteProfile_(html) {
    const script = String(html || '').match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!script) return [];
    let data;
    try {
      data = JSON.parse(decodeHtml_(script[1]));
    } catch (e) {
      return [];
    }
    const pages = (((data.props || {}).pageProps || {}).ssrData || {}).pages || [];
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] || {};
      if (!page._id || !page.title) continue;
      out.push({
        sourceType: 'blog',
        title: String(page.title || ''),
        url: 'https://tilnote.io/pages/' + page._id,
        summary: stripHtml_(String(page.content || '')).slice(0, 700),
        publishedAt: page.createdAt || today_(),
        author: page.userId && page.userId.name ? page.userId.name : '',
        tags: Array.isArray(page.tags) ? page.tags.join(',') : ''
      });
    }
    return out;
  }

  function resolveYouTubeRssUrl_(channelUrl) {
    try {
      const res = UrlFetchApp.fetch(channelUrl, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() < 200 || res.getResponseCode() >= 400) return '';
      const html = res.getContentText();
      const idMatch = html.match(/"channelId":"(UC[^"]+)"/) ||
        html.match(/<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[^"']+)["']/i) ||
        html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]+)/);
      if (!idMatch) return '';
      return 'https://www.youtube.com/feeds/videos.xml?channel_id=' + idMatch[1];
    } catch (e) {
      return '';
    }
  }

  function parseRssItems_(sourceType, xmlText) {
    const xml = XmlService.parse(xmlText);
    const root = xml.getRootElement();
    const ns = root.getNamespace();

    if (root.getChild('channel')) {
      const items = root.getChild('channel').getChildren('item');
      return items.map(function (it) {
        return {
          sourceType: sourceType,
          title: textOf_(it.getChild('title')),
          url: textOf_(it.getChild('link')),
          summary: stripHtml_(textOf_(it.getChild('description'))),
          publishedAt: textOf_(it.getChild('pubDate'))
        };
      });
    }

    const entries = root.getChildren('entry', ns);
    return entries.map(function (entry) {
      return {
        sourceType: sourceType,
        title: textOf_(entry.getChild('title', ns)),
        url: atomLink_(entry, ns),
        summary: stripHtml_(textOf_(entry.getChild('summary', ns)) || textOf_(entry.getChild('content', ns))),
        publishedAt: textOf_(entry.getChild('published', ns)) || textOf_(entry.getChild('updated', ns))
      };
    });
  }

  function fetchStaticLinks_(sourceType, csv) {
    const urls = splitCsv_(csv);
    const out = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const meta = fetchPageMeta_(url);
      out.push({
        sourceType: sourceType,
        title: meta.title || titleFromUrl_(url),
        url: url,
        summary: meta.description || 'Weekly product or catalog update from ' + sourceType.toUpperCase() + '.',
        publishedAt: today_()
      });
    }
    return out;
  }

  function fetchPageMeta_(url) {
    try {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() < 200 || res.getResponseCode() >= 400) return {};
      const html = res.getContentText();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      return {
        title: titleMatch ? decodeHtml_(stripHtml_(titleMatch[1])).slice(0, 160) : '',
        description: descMatch ? decodeHtml_(stripHtml_(descMatch[1])).slice(0, 500) : ''
      };
    } catch (e) {
      return {};
    }
  }

  function fetchTrendNewsHighlights_() {
    const sheetId = getConfig_('TREND_NEWS_SHEET_ID');
    if (!sheetId) return [];
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      const sh = ss.getSheetByName('DailyIssues');
      if (!sh) return [];
      const rows = sh.getDataRange().getValues();
      if (rows.length < 2) return [];
      const idx = headerIndex_(rows[0]);
      const week = currentWeek_();
      const out = [];
      for (let i = 1; i < rows.length; i++) {
        const date = dateKey_(rows[i][idx.issue_date]);
        if (date < week.start || date > week.end) continue;
        const topic = rows[i][idx.topic_primary] || '';
        const url = rows[i][idx.source_url] || '';
        if (!topic || !url) continue;
        out.push({
          sourceType: 'daily-news',
          title: String(topic),
          url: String(url),
          summary: String(rows[i][idx.why_kr] || rows[i][idx.story_s3] || rows[i][idx.story_s1] || '').slice(0, 700),
          publishedAt: date,
          tags: [rows[i][idx.track], rows[i][idx.cefr_level]].filter(Boolean).join(',')
        });
      }
      return out;
    } catch (e) {
      log_('TREND_NEWS_SHEET_ID import failed: ' + e);
      return [];
    }
  }

  function normalizeItem_(item, week) {
    const url = canonicalUrl_(item.url);
    const title = String(item.title || '').replace(/\s+/g, ' ').trim();
    const summary = String(item.summary || '').replace(/\s+/g, ' ').trim();
    const dedupe = url || fingerprint_(title + ' ' + summary);
    return {
      collectedAt: new Date(),
      weekKey: week.key,
      sourceType: String(item.sourceType || 'other'),
      title: title,
      url: url,
      summary: summary,
      publishedAt: dateKey_(item.publishedAt) || today_(),
      author: String(item.author || ''),
      tags: String(item.tags || ''),
      score: scoreForType_(item.sourceType),
      dedupeKey: dedupe,
      status: 'candidate'
    };
  }

  function scoreForType_(sourceType) {
    const map = { blog: 90, youtube: 85, linkedin: 82, tpt: 80, imweb: 78, 'daily-news': 65 };
    return map[sourceType] || 50;
  }

  function appendSource_(sh, item) {
    sh.appendRow([
      item.collectedAt, item.weekKey, item.sourceType, item.title, item.url, item.summary,
      item.publishedAt, item.author, item.tags, item.score, item.dedupeKey, item.status
    ]);
  }

  function buildSeen_(sh) {
    const rows = sh.getDataRange().getValues();
    const seen = {};
    if (rows.length < 2) return seen;
    const idx = headerIndex_(rows[0]);
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][idx.dedupe_key] || canonicalUrl_(rows[i][idx.url]) || fingerprint_(rows[i][idx.title]);
      if (key) seen[key] = true;
    }
    return seen;
  }

  function textOf_(el) {
    if (!el) return '';
    return String(el.getText() || '').trim();
  }

  function atomLink_(entry, ns) {
    const links = entry.getChildren('link', ns);
    for (let i = 0; i < links.length; i++) {
      const href = links[i].getAttribute('href');
      if (href) return href.getValue();
    }
    return '';
  }

  function stripHtml_(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function decodeHtml_(value) {
    return String(value || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function titleFromUrl_(url) {
    const parts = String(url || '').split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || url).replace(/[-_]+/g, ' ').trim();
  }

  return {
    collect: collect,
    parseRssItemsForTest: parseRssItems_,
    parseTilnoteProfileForTest: parseTilnoteProfile_,
    normalizeItemForTest: normalizeItem_
  };
})();
