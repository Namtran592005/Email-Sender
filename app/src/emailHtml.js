export function isFullHtml(s) {
  const str = String(s || '');
  return /^\s*<!doctype\s+html/i.test(str) || /<html[\s>]/i.test(str);
}

export function buildEmailHtml(body) {
  const raw = String(body || '');
  if (isFullHtml(raw)) return raw;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 17px;
    line-height: 1.6;
    color: #1c1c1e;
    word-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
</style>
</head>
<body>${raw}</body>
</html>`;
}
