import AsyncStorage from '@react-native-async-storage/async-storage';

const SENT_KEY = '@email_sender/sent';
const MAX_SENT = 60;

function stripHtml(s) {
  return String(s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getSentEmails() {
  try {
    const raw = await AsyncStorage.getItem(SENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addSentEmail({ to, subject, fromName, fromEmail, html, attachments }) {
  const list = await getSentEmails();
  const entry = {
    id: `s${Date.now()}${Math.floor(Math.random() * 1e4)}`,
    to: String(to || ''),
    subject: String(subject || '(no subject)'),
    fromName: String(fromName || ''),
    fromEmail: String(fromEmail || ''),
    html: String(html || ''),
    snippet: stripHtml(html).slice(0, 150),
    date: new Date().toISOString(),
    attachments: Array.isArray(attachments)
      ? attachments.map((a) => ({
          name: String(a && a.name || ''),
          size: Number((a && a.size) || 0),
        }))
      : [],
  };
  const next = [entry, ...list].slice(0, MAX_SENT);
  await AsyncStorage.setItem(SENT_KEY, JSON.stringify(next));
  return entry;
}

export async function removeSentEmail(id) {
  const list = await getSentEmails();
  await AsyncStorage.setItem(SENT_KEY, JSON.stringify(list.filter((x) => x.id !== id)));
}

export async function clearSentEmails() {
  await AsyncStorage.removeItem(SENT_KEY);
}