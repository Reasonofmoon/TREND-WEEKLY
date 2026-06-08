/**
 * Moonlit-style static HTML edition for GitHub Pages.
 */
var HtmlPageGenerator_ = (function () {
  function buildPage(title, week, items) {
    const grouped = groupByType_(items);
    const counts = countByType_(items);
    const topCards = items.map(function (item, i) { return topCard_(item, i + 1); }).join('\n');

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>' + esc_(title) + '</title>',
      '<meta name="description" content="달의이성 주간 큐레이션: 글, 영상, 상품, 일간 뉴스 중 이번 주 다시 볼 만한 10가지">',
      '<style>' + css_() + '</style>',
      '</head>',
      '<body>',
      '<main class="page-shell">',
      hero_(title, week, counts),
      '<section class="section" id="top10">',
      '<div class="section-kicker">Curated shelf</div>',
      '<h2>이번 주 TOP 10</h2>',
      '<div class="top-grid">' + (topCards || empty_('이번 주 후보가 아직 없습니다.')) + '</div>',
      '</section>',
      sourceSection_('Tilnote / Blog', grouped.blog),
      sourceSection_('YouTube', grouped.youtube),
      sourceSection_('LinkedIn', grouped.linkedin),
      sourceSection_('Product shelf', (grouped.tpt || []).concat(grouped.imweb || [])),
      sourceSection_('TREND-NEWS highlights', grouped['daily-news']),
      ideasSection_(items),
      sourcesSection_(items),
      '</main>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  function hero_(title, week, counts) {
    return [
      '<header class="hero">',
      '<nav class="masthead">',
      '<div class="brand-mark" aria-hidden="true">' + logoSvg_() + '</div>',
      '<div><div class="eyebrow">Moonlit weekly digest</div><div class="brand-sub">Reasonofmoon archive</div></div>',
      '</nav>',
      '<div class="hero-grid">',
      '<div>',
      '<p class="date-line">' + esc_(week.start) + ' ~ ' + esc_(week.end) + '</p>',
      '<h1>' + esc_(title.replace(/^Weekly Digest\s*—\s*/, '')) + '</h1>',
      '<p class="lede">한 주 동안 발행한 글, 영상, 상품 소식, 그리고 매일 만든 뉴스 중 다시 볼 만한 10가지를 조용한 서가처럼 정리했습니다.</p>',
      '</div>',
      '<aside class="stats-card">',
      stat_('Blog', counts.blog || 0),
      stat_('YouTube', counts.youtube || 0),
      stat_('Product', (counts.tpt || 0) + (counts.imweb || 0)),
      stat_('Daily News', counts['daily-news'] || 0),
      '</aside>',
      '</div>',
      '</header>'
    ].join('\n');
  }

  function topCard_(item, rank) {
    return [
      '<article class="digest-card">',
      '<div class="card-topline"><span class="rank">#' + rank + '</span><span class="tag">' + esc_(labelForType_(item.sourceType)) + '</span></div>',
      '<h3><a href="' + escAttr_(item.url) + '">' + esc_(item.title) + '</a></h3>',
      item.summary ? '<p>' + esc_(String(item.summary).slice(0, 240)) + '</p>' : '',
      '<a class="read-link" href="' + escAttr_(item.url) + '">원문 보기</a>',
      '</article>'
    ].join('\n');
  }

  function sourceSection_(heading, items) {
    items = items || [];
    return [
      '<section class="section">',
      '<div class="section-kicker">Collection</div>',
      '<h2>' + esc_(heading) + '</h2>',
      items.length ? '<div class="list-stack">' + items.map(listItem_).join('\n') + '</div>' : empty_('이번 주 항목이 없습니다.'),
      '</section>'
    ].join('\n');
  }

  function listItem_(item) {
    return [
      '<article class="list-item">',
      '<div><span class="tag muted">' + esc_(labelForType_(item.sourceType)) + '</span><h3><a href="' + escAttr_(item.url) + '">' + esc_(item.title) + '</a></h3></div>',
      item.summary ? '<p>' + esc_(String(item.summary).slice(0, 220)) + '</p>' : '',
      '</article>'
    ].join('\n');
  }

  function ideasSection_(items) {
    const ideas = [];
    for (let i = 0; i < items.length && ideas.length < 5; i++) {
      ideas.push('"' + esc_(items[i].title).slice(0, 80) + '"를 짧은 글, 이메일 노트, 상품 소개 중 하나로 확장하기');
    }
    if (!ideas.length) ideas.push('WeeklyConfig에 소스를 추가한 뒤 다시 수집하기');
    return [
      '<section class="section ideas">',
      '<div class="section-kicker">Next shelf</div>',
      '<h2>다음 주 콘텐츠 아이디어</h2>',
      '<ul>' + ideas.map(function (idea) { return '<li>' + idea + '</li>'; }).join('\n') + '</ul>',
      '</section>'
    ].join('\n');
  }

  function sourcesSection_(items) {
    return [
      '<section class="section sources">',
      '<details>',
      '<summary>전체 출처 보기</summary>',
      '<ul>' + items.map(function (item) {
        return '<li>[' + esc_(labelForType_(item.sourceType)) + '] <a href="' + escAttr_(item.url) + '">' + esc_(item.title) + '</a></li>';
      }).join('\n') + '</ul>',
      '</details>',
      '</section>'
    ].join('\n');
  }

  function stat_(label, value) {
    return '<div class="stat"><span>' + esc_(label) + '</span><strong>' + value + '</strong></div>';
  }

  function empty_(text) {
    return '<p class="empty">' + esc_(text) + '</p>';
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

  function countByType_(items) {
    const out = {};
    for (let i = 0; i < items.length; i++) out[items[i].sourceType] = (out[items[i].sourceType] || 0) + 1;
    return out;
  }

  function labelForType_(type) {
    const map = { blog: 'Blog', youtube: 'YouTube', linkedin: 'LinkedIn', tpt: 'TPT', imweb: 'Imweb', 'daily-news': 'Daily News' };
    return map[type] || 'Source';
  }

  function logoSvg_() {
    return '<svg viewBox="0 0 64 64" role="img" aria-label="Moonlit mark"><path d="M42.6 9.2c-8.7 2.5-15 10.5-15 20 0 11.5 9.3 20.8 20.8 20.8 1.5 0 3-.2 4.4-.5C48.9 56 41.7 60 33.5 60 18 60 5.5 47.5 5.5 32S18 4 33.5 4c3.2 0 6.3.5 9.1 1.6z" fill="currentColor"/><path d="M14 45c8-4.5 17.7-4.5 25.7 0M17.5 39.2c6.2-2.7 12.8-2.7 19 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  function css_() {
    return [
      '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Spectral:wght@400;500;600&display=swap");',
      ':root{--ink-900:#14162a;--ink-800:#1b1e35;--paper-50:#fbf8f0;--paper-100:#f6f0e2;--paper-200:#efe7d3;--paper-300:#e4d9bf;--brass-50:#f7eed8;--brass-500:#bf9647;--brass-700:#855f25;--moon-500:#9aa9c1;--plum-500:#7b6188;--text-muted:#5a5f78;}',
      '*{box-sizing:border-box}body{margin:0;background:var(--paper-100);color:var(--ink-800);font-family:"Hanken Grotesk",system-ui,sans-serif;line-height:1.62;}a{color:var(--brass-700);text-decoration:none}a:hover{text-decoration:underline}.page-shell{max-width:1160px;margin:0 auto;padding:28px 20px 64px}.hero{border:1px solid var(--paper-300);background:linear-gradient(135deg,var(--paper-50),var(--paper-200));box-shadow:0 18px 50px rgba(20,22,42,.12);padding:28px;border-radius:28px}.masthead{display:flex;gap:14px;align-items:center;margin-bottom:48px}.brand-mark{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--ink-800);color:var(--paper-50)}.brand-mark svg{width:30px}.eyebrow,.section-kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--brass-700);font-weight:700}.brand-sub,.date-line{color:var(--text-muted);margin:0}.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;align-items:end}h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;color:var(--ink-900);line-height:1.05;margin:0}h1{font-size:clamp(44px,8vw,86px);letter-spacing:0}h2{font-size:36px;margin-top:6px;margin-bottom:20px}h3{font-size:24px}.lede{font-family:"Spectral",serif;font-size:20px;max-width:680px;color:var(--text-muted)}.stats-card{background:rgba(251,248,240,.78);border:1px solid var(--paper-300);border-radius:20px;padding:18px}.stat{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--paper-300)}.stat:last-child{border-bottom:0}.stat strong{font-size:24px;color:var(--ink-900)}.section{margin-top:42px}.top-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.digest-card,.list-item{background:var(--paper-50);border:1px solid var(--paper-300);border-radius:20px;padding:22px;box-shadow:0 10px 26px rgba(20,22,42,.07)}.digest-card{min-height:250px;display:flex;flex-direction:column}.digest-card p,.list-item p{color:var(--text-muted);margin:12px 0}.card-topline{display:flex;justify-content:space-between;gap:10px;margin-bottom:18px}.rank{font-weight:800;color:var(--brass-700)}.tag{display:inline-flex;border:1px solid var(--paper-300);background:var(--brass-50);color:var(--brass-700);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700}.tag.muted{background:var(--paper-200);color:var(--text-muted)}.read-link{margin-top:auto;font-weight:700}.list-stack{display:grid;gap:14px}.list-item h3{margin-top:8px}.ideas{background:var(--ink-800);color:var(--paper-50);border-radius:24px;padding:28px}.ideas h2{color:var(--paper-50)}.ideas .section-kicker{color:var(--brass-300,#d8b873)}.ideas li{margin:8px 0}.sources details{background:var(--paper-50);border:1px solid var(--paper-300);border-radius:18px;padding:18px}.empty{border:1px dashed var(--paper-300);border-radius:18px;padding:20px;color:var(--text-muted);background:rgba(251,248,240,.55)}@media (max-width:760px){.hero-grid,.top-grid{grid-template-columns:1fr}.hero{padding:22px;border-radius:22px}h1{font-size:42px}.page-shell{padding:16px 14px 44px}}'
    ].join('\n');
  }

  function esc_(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr_(value) {
    return esc_(value).replace(/'/g, '&#39;');
  }

  return { buildPage: buildPage };
})();
