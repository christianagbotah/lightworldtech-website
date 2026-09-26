const SITE_URL = 'https://lightworldtech.com';
const INDEXNOW_KEY = '2dd0a63b87d5b926f386af94ed58215e';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const KEY_LOCATION = SITE_URL + '/' + INDEXNOW_KEY + '.txt';

function normalizeUrl(input) {
  const value = String(input || '').trim();
  if (!value) throw new Error('Empty URL is not allowed');

  const url = new URL(value, SITE_URL + '/');
  if (url.origin !== SITE_URL) {
    throw new Error('Refusing URL outside canonical host: ' + url.toString());
  }

  url.hash = '';
  return url.toString();
}

const requested = process.argv.slice(2);
if (!requested.length) {
  console.error('Usage: bun scripts/indexnow-submit.mjs / /services/software-development /contact');
  process.exit(64);
}

let urlList;
try {
  urlList = [...new Set(requested.map(normalizeUrl))];
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(65);
}

if (urlList.length > 10000) {
  console.error('IndexNow accepts at most 10,000 URLs in one request.');
  process.exit(66);
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(SITE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
});

if (![200, 202].includes(response.status)) {
  const body = await response.text().catch(() => '');
  console.error(
    'IndexNow submission failed with HTTP ' +
      response.status +
      (body ? ': ' + body.slice(0, 500) : ''),
  );
  process.exit(1);
}

console.log(
  'IndexNow accepted ' +
    urlList.length +
    ' canonical URL' +
    (urlList.length === 1 ? '' : 's') +
    ' with HTTP ' +
    response.status +
    '.',
);
