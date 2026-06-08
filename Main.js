/**
 * TREND-WEEKLY entry points.
 */
const TZ = 'Asia/Seoul';
const DEFAULT_SHEET_ID = '1h_HbL9-xUavM0Yz_RHTV_FD1CcnrSZuMT-OsSAMick8';

const SHEET_CONFIG = 'WeeklyConfig';
const SHEET_SOURCES = 'WeeklySources';
const SHEET_DIGEST = 'WeeklyDigest';
const SHEET_ISSUE_LOG = 'WeeklyIssueLog';
const SHEET_LOGS = 'Logs';

function initialSetup() {
  Schema_.ensureSheets();
  Schema_.seedConfig();
  log_('initialSetup complete. Next: set GITHUB_TOKEN, source URLs, then installWeeklyTriggers().');
}

function configureReasonofmoonSources() {
  Schema_.ensureSheets();
  setConfig_('YOUTUBE_CHANNEL_URL', 'https://www.youtube.com/@reasonofmoon', 'Reasonofmoon YouTube channel; RSS is resolved automatically');
  setConfig_('LINKEDIN_SOURCE_URLS', 'https://www.linkedin.com/in/reasonofmoon/', 'Reasonofmoon LinkedIn profile');
  setConfig_('TPT_SOURCE_URLS', 'https://www.teacherspayteachers.com/store/moonlight-english-6940', 'Moonlight English TPT store');
  setConfig_('IMWEB_SOURCE_URLS', 'https://e-teachers.imweb.me/21', 'Imweb original-reader product page');
  log_('Reasonofmoon source URLs configured.');
  return {
    youtube: getConfig_('YOUTUBE_CHANNEL_URL'),
    linkedin: getConfig_('LINKEDIN_SOURCE_URLS'),
    tpt: getConfig_('TPT_SOURCE_URLS'),
    imweb: getConfig_('IMWEB_SOURCE_URLS')
  };
}

function installWeeklyTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) ScriptApp.deleteTrigger(triggers[i]);

  ScriptApp.newTrigger('collectWeeklySources')
    .timeBased()
    .atHour(6)
    .nearMinute(10)
    .everyDays(1)
    .inTimezone(TZ)
    .create();

  ScriptApp.newTrigger('runWeeklyDigestNow')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .nearMinute(0)
    .everyWeeks(1)
    .inTimezone(TZ)
    .create();

  ScriptApp.newTrigger('runHealthCheck')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .nearMinute(20)
    .everyWeeks(1)
    .inTimezone(TZ)
    .create();

  log_('Weekly triggers installed: collect daily@06:10, digest Monday@08:00, health Monday@08:20 KST.');
}

function collectWeeklySources() {
  Schema_.ensureSheets();
  return SourceCollector_.collect();
}

function generateWeeklyDigest() {
  Schema_.ensureSheets();
  return WeeklyDigestGenerator_.generate();
}

function publishWeeklyGitHubIssue() {
  Schema_.ensureSheets();
  return GitHubPublisher_.publishLatest();
}

function runWeeklyDigestNow() {
  Schema_.ensureSheets();
  const collected = collectWeeklySources();
  const digest = generateWeeklyDigest();
  const published = publishWeeklyGitHubIssue();
  log_('runWeeklyDigestNow complete. collected=' + collected.added +
       ' digestItems=' + digest.itemCount +
       ' published=' + published.status);
  return { collected: collected, digest: digest, published: published };
}

function runHealthCheck() {
  return HealthCheck_.run();
}

function getSS_() {
  const id = getProp_('SHEET_ID') || DEFAULT_SHEET_ID;
  return SpreadsheetApp.openById(id);
}

function getConfig_(key, fallback) {
  const prop = getProp_(key);
  if (prop) return prop;

  const sh = getSS_().getSheetByName(SHEET_CONFIG);
  if (!sh) return fallback || '';
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === key) return String(rows[i][1] || '').trim();
  }
  return fallback || '';
}

function setConfig_(key, value, note) {
  const sh = getSS_().getSheetByName(SHEET_CONFIG);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === key) {
      sh.getRange(i + 1, 2).setValue(value);
      if (note != null) sh.getRange(i + 1, 3).setValue(note);
      return;
    }
  }
  sh.appendRow([key, value, note || '']);
}

function getProp_(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key) || '';
  } catch (e) {
    return '';
  }
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function dateKey_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
  }
  const text = String(value);
  const m = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : text.slice(0, 10);
}

function currentWeek_() {
  return weekForDate_(new Date());
}

function weekForDate_(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(local.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const startKey = Utilities.formatDate(start, TZ, 'yyyy-MM-dd');
  const endKey = Utilities.formatDate(end, TZ, 'yyyy-MM-dd');
  return { start: startKey, end: endKey, key: startKey + '_' + endKey };
}

function splitCsv_(value) {
  return String(value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function canonicalUrl_(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return raw.split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();
}

function fingerprint_(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function hasInternalBlockedTerm_(text) {
  const lower = String(text || '').toLowerCase();
  const terms = internalBlockedTerms_();
  for (let i = 0; i < terms.length; i++) {
    if (terms[i] && lower.indexOf(terms[i]) >= 0) return true;
  }
  return false;
}

function internalBlockedTerms_() {
  const defaults = ['connectedu', 'connect edu', 'booktalk', 'book talk', 'news carrier edu'];
  const custom = splitCsv_(getConfig_('INTERNAL_BLOCKED_TERMS', ''))
    .map(function (s) { return s.toLowerCase(); });
  return defaults.concat(custom);
}

function headerIndex_(header) {
  const idx = {};
  for (let i = 0; i < header.length; i++) idx[String(header[i] || '')] = i;
  return idx;
}

function log_(message) {
  console.log(message);
  try {
    const sh = getSS_().getSheetByName(SHEET_LOGS);
    if (sh) sh.appendRow([new Date(), message]);
  } catch (e) {}
}
