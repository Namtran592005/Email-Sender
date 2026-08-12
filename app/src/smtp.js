import TcpSocket from 'react-native-tcp-socket';
import { File } from 'expo-file-system';

const CONNECT_TIMEOUT = 15000;
const SESSION_TIMEOUT = 60000;

function base64FromBytes(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const c1 = bytes[i];
    const c2 = bytes[i + 1];
    const c3 = bytes[i + 2];
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 3) << 4) | ((c2 === undefined ? 0 : c2) >> 4));
    out += c2 === undefined ? '=' : chars.charAt(((c2 & 15) << 2) | ((c3 === undefined ? 0 : c3) >> 6));
    out += c3 === undefined ? '=' : chars.charAt(c3 & 63);
  }
  return out;
}

function utf8Bytes(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    let code = s.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
      const lo = s.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (lo - 0xdc00);
        i += 1;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
  }
  return bytes;
}

const b64 = (s) => base64FromBytes(utf8Bytes(s));

function wrapBase64(b64str, width = 76) {
  const out = [];
  for (let i = 0; i < b64str.length; i += width) out.push(b64str.slice(i, i + width));
  return out.join('\r\n');
}

async function attachmentBase64(att) {
  const file = new File(att.uri);
  if (!file.exists) throw new Error(`Attachment missing: ${att.name}`);
  return file.base64();
}

function sanitizeFilename(name) {
  return String(name || 'file').replace(/[\r\n"]/g, '').trim() || 'file';
}

function isAscii(s) {
  return /^[\x20-\x7E]*$/.test(s);
}

function encodeHeader(value) {
  const str = String(value || '');
  return isAscii(str) ? str : `=?UTF-8?B?${b64(str)}?=`;
}

function parseReply(lines) {
  const last = lines[lines.length - 1];
  const codeMatch = last.match(/^(\d{3})\s/);
  const code = codeMatch ? parseInt(codeMatch[1], 10) : 0;
  return { code, text: lines.join('\n').trim() };
}

const isStartTlsPort = (p) => {
  const n = Number(p) || 465;
  return n === 587 || n === 25;
};

function runSession(cfg, actions) {
  const c = { tls: true, port: 465, tlsCheckValidity: true, ...cfg };
  const port = Number(c.port) || 465;
  const secure = c.tls !== false;
  const starttls = secure && isStartTlsPort(port);
  const tlsOpts = c.tlsCheckValidity === false ? { rejectUnauthorized: false } : {};

  return new Promise((resolve, reject) => {
    let sock = null;
    let settled = false;
    let sessionTimer = null;

    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      if (sessionTimer) clearTimeout(sessionTimer);
      if (sock) {
        try { sock.removeAllListeners(); } catch (e) {}
        try { sock.destroy(); } catch (e) {}
      }
      if (err) reject(err);
      else resolve(value);
    };

    // ---- reply reader ----
    let buffer = '';
    const waiters = [];

    const flush = () => {
      while (true) {
        const lines = buffer.split('\r\n');
        let parseAt = -1;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line && /^\d{3}\s/.test(line)) {
            parseAt = i;
            break;
          }
        }
        if (parseAt < 0) break;
        const reply = parseReply(lines.slice(0, parseAt + 1));
        buffer = lines.slice(parseAt + 1).join('\r\n');
        const w = waiters.shift();
        if (w) w.resolveReply(reply);
        else break;
      }
    };

    const recv = () =>
      new Promise((resolveReply, rejectReply) => {
        const t = setTimeout(
          () =>
            rejectReply(
              new Error(`SMTP timeout waiting for server. Received: ${JSON.stringify(buffer.slice(-200))}`)
            ),
          20000
        );
        waiters.push({
          resolveReply: (v) => {
            clearTimeout(t);
            resolveReply(v);
          },
          rejectReply: (e) => {
            clearTimeout(t);
            rejectReply(e);
          },
        });
        flush();
      });

    const sendCmd = (line) => {
      if (sock) sock.write(line + '\r\n');
      else throw new Error('Not connected');
    };

    const writeRaw = (s) => {
      if (sock) sock.write(s);
      else throw new Error('Not connected');
    };

    sessionTimer = setTimeout(() => finish(new Error('SMTP session timeout')), SESSION_TIMEOUT);

    const doActions = () => {
      try {
        const api = { send: sendCmd, write: writeRaw, recv, finish, starttls };
        api.upgrade = () => {
          if (!starttls) return Promise.resolve();
          try {
            // Upgrade the plain TCP socket to TLS in place (STARTTLS).
            new TcpSocket.TLSSocket(sock, tlsOpts);
          } catch (e) {
            return Promise.reject(e);
          }
          return new Promise((r) => setTimeout(r, 250));
        };
        const p = actions(api);
        if (p && p.catch) p.catch((e) => finish(e));
      } catch (e) {
        finish(e);
      }
    };

    if (secure && !starttls) {
      // Implicit TLS (e.g. port 465). connectTLS wires startTLS() before connect so the native
      // socket is created as SSLSocket (plain createConnection ignores the `tls` flag).
      sock = TcpSocket.connectTLS(
        { host: c.host, port, connectTimeout: CONNECT_TIMEOUT, ...tlsOpts },
        doActions
      );
    } else {
      // Plain TCP first (tls off, or STARTTLS on 587/25).
      sock = TcpSocket.createConnection(
        { host: c.host, port, connectTimeout: CONNECT_TIMEOUT },
        doActions
      );
    }

    if (sock && typeof sock.setEncoding === 'function') sock.setEncoding('utf8');

    sock.on('data', (chunk) => {
      buffer += typeof chunk === 'string' ? chunk : String.fromCharCode.apply(null, Array.from(chunk));
      flush();
    });
    sock.on('error', (e) => finish(new Error(`Connection error: ${(e && e.message) || e}`)));
    sock.on('close', () => finish(new Error('SMTP connection closed')));
  });
}

async function authFlow(send, recv, c) {
  send(`AUTH PLAIN ${b64(`\u0000${c.user}\u0000${c.pass}`)}`);
  let auth = await recv();
  if (auth.code !== 235) {
    send('AUTH LOGIN');
    let r = await recv();
    if (r.code !== 334) throw new Error('SMTP auth failed');
    send(b64(c.user));
    r = await recv();
    if (r.code !== 334) throw new Error('SMTP auth failed');
    send(b64(c.pass));
    auth = await recv();
  }
  if (auth.code !== 235) throw new Error(`Auth failed: ${auth.text}`);
}

export async function sendEmail(mail, cfg) {
  const c = { ...cfg };
  if (!c.host || !c.port) throw new Error('Missing SMTP host/port. Configure SMTP in Settings.');
  if (!c.user || !c.pass) throw new Error('Missing SMTP username/password.');
  if (!c.fromEmail) throw new Error('Missing sender email.');

  const recipients = (Array.isArray(mail.to) ? mail.to : String(mail.to || '').split(',')).map((s) => s.trim()).filter(Boolean);
  const ccList = (Array.isArray(mail.cc) ? mail.cc : String(mail.cc || '').split(',')).map((s) => s.trim()).filter(Boolean);
  const bccList = (Array.isArray(mail.bcc) ? mail.bcc : String(mail.bcc || '').split(',')).map((s) => s.trim()).filter(Boolean);

  const fromHeader = `From: ${encodeHeader(c.fromName || c.fromEmail)} <${c.fromEmail}>`;
  const toHeader = recipients.length ? `To: ${recipients.join(', ')}` : null;
  const ccHeader = ccList.length ? `Cc: ${ccList.join(', ')}` : null;
  const subjectHeader = `Subject: ${encodeHeader(mail.subject)}`;
  const html = String(mail.html || '').trim();
  const attachments = Array.isArray(mail.attachments) ? mail.attachments.filter((a) => a && a.uri) : [];

  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headersWithoutType = [
    fromHeader,
    toHeader,
    ccHeader,
    subjectHeader,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${c.host}>`,
  ]
    .filter(Boolean)
    .join('\r\n');

  let messageBody;
  if (attachments.length) {
    const parts = [];
    parts.push(
      `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html}`
    );
    for (const att of attachments) {
      const b64content = await attachmentBase64(att);
      const mime = att.mimeType || 'application/octet-stream';
      const name = sanitizeFilename(att.name);
      const encodedName = isAscii(name) ? name : `=?UTF-8?B?${b64(name)}?=`;
      parts.push(
        `--${boundary}\r\nContent-Type: ${mime}; name="${encodedName}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${encodedName}"\r\n\r\n${wrapBase64(b64content)}`
      );
    }
    parts.push(`--${boundary}--`);
    const contentType = `Content-Type: multipart/mixed; boundary="${boundary}"`;
    messageBody = `${headersWithoutType}\r\n${contentType}\r\n\r\n${parts.join('\r\n')}`;
  } else {
    messageBody = `${headersWithoutType}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html}`;
  }

  const dotStuffed = messageBody
    .split('\n')
    .map((l) => (/^\./.test(l) ? '.' + l : l).replace(/\r$/, ''))
    .join('\r\n');

  return runSession(c, async ({ send, write, recv, finish, starttls, upgrade }) => {
    const greet = await recv();
    if (greet.code !== 220) throw new Error(greet.text);

    send(`EHLO ${c.host || 'localhost'}`);
    const ehlo = await recv();
    if (ehlo.code !== 250) throw new Error(ehlo.text);

    if (starttls) {
      send('STARTTLS');
      const st = await recv();
      if (st.code !== 220) throw new Error(st.text);
      await upgrade();
      send(`EHLO ${c.host || 'localhost'}`);
      const ehlo2 = await recv();
      if (ehlo2.code !== 250) throw new Error(ehlo2.text);
    }

    await authFlow(send, recv, c);

    send(`MAIL FROM:<${c.fromEmail}>`);
    const mf = await recv();
    if (mf.code !== 250) throw new Error(mf.text);

    const envelope = [...recipients, ...ccList, ...bccList];
    for (const addr of envelope) {
      send(`RCPT TO:<${addr}>`);
      const rcpt = await recv();
      if (rcpt.code !== 250 && rcpt.code !== 251) throw new Error(`Recipient rejected: ${rcpt.text}`);
    }

    send('DATA');
    const dc = await recv();
    if (dc.code !== 354) throw new Error(dc.text);

    write(dotStuffed + '\r\n.\r\n');
    const done = await recv();
    if (done.code !== 250) throw new Error(`Send failed: ${done.text}`);

    send('QUIT');
    await recv().catch(() => {});
    finish(null, { ok: true });
  });
}

export async function testConnection(cfg) {
  const c = { ...cfg };
  if (!c.host || !c.port) throw new Error('Missing host/port.');
  return runSession(c, async ({ send, recv, finish, starttls, upgrade }) => {
    const greet = await recv();
    if (greet.code !== 220) throw new Error(`Server: ${greet.text}`);

    send(`EHLO ${c.host}`);
    const ehlo = await recv();
    if (ehlo.code !== 250) throw new Error(`EHLO failed: ${ehlo.text}`);

    if (c.user && c.pass) {
      if (starttls) {
        send('STARTTLS');
        const st = await recv();
        if (st.code !== 220) throw new Error(st.text);
        await upgrade();
        send(`EHLO ${c.host}`);
        const ehlo2 = await recv();
        if (ehlo2.code !== 250) throw new Error(`EHLO failed: ${ehlo2.text}`);
      }
      await authFlow(send, recv, c);
    } else {
      throw new Error('Enter username and password to test authentication.');
    }

    send('QUIT');
    await recv().catch(() => {});
    finish(null, { ok: true });
  });
}