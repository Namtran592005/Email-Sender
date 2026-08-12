import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCOUNTS_KEY = '@email_sender/smtp_accounts';
const DEFAULT_KEY = '@email_sender/smtp_default_id';
const LEGACY_KEY = '@email_sender/smtp_config';

export const defaultSmtpConfig = {
  host: 'smtp.gmail.com',
  port: '465',
  tls: true,
  user: '',
  pass: '',
  fromName: 'Personal Letter',
  fromEmail: '',
};

export const smtpIsConfigured = (c) => Boolean(c && c.host && c.user && c.fromEmail && c.id);

const cleanAccount = (a) => ({
  id: typeof (a && a.id) === 'string' && a.id ? a.id : `a${Date.now()}${Math.floor(Math.random() * 1e4)}`,
  name: typeof (a && a.name) === 'string' ? a.name : '',
  host: typeof (a && a.host) === 'string' ? a.host : '',
  port: typeof (a && a.port) === 'string' && a.port ? a.port : '465',
  tls: (a && a.tls) !== false,
  user: typeof (a && a.user) === 'string' ? a.user : '',
  pass: typeof (a && a.pass) === 'string' ? a.pass : '',
  fromName: typeof (a && a.fromName) === 'string' ? a.fromName : defaultSmtpConfig.fromName,
  fromEmail: typeof (a && a.fromEmail) === 'string' ? a.fromEmail : '',
});

async function setAccounts(list) {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

async function migrateLegacy() {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacy) return false;
    const parsed = JSON.parse(legacy);
    if (!parsed || !parsed.host) return false;
    const account = cleanAccount({ ...parsed, name: 'My account' });
    await setAccounts([account]);
    await AsyncStorage.setItem(DEFAULT_KEY, account.id);
    await AsyncStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function getSmtpAccounts() {
  try {
    await migrateLegacy();
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return (Array.isArray(list) ? list : []).map(cleanAccount);
  } catch {
    return [];
  }
}

export async function saveSmtpAccounts(list) {
  await setAccounts((Array.isArray(list) ? list : []).map(cleanAccount));
}

export async function addSmtpAccount(input) {
  const list = await getSmtpAccounts();
  const account = cleanAccount({ ...input });
  if (!list.some((a) => a.id === account.id)) list.unshift(account);
  else {
    const idx = list.findIndex((a) => a.id === account.id);
    list[idx] = account;
  }
  await setAccounts(list);
  const def = await getDefaultSmtpId();
  if (!def) await AsyncStorage.setItem(DEFAULT_KEY, account.id);
  return account;
}

export async function updateSmtpAccount(id, patch) {
  const list = await getSmtpAccounts();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const updated = cleanAccount({ ...list[idx], ...patch, id });
  list[idx] = updated;
  await setAccounts(list);
  return updated;
}

export async function deleteSmtpAccount(id) {
  const list = await getSmtpAccounts();
  const next = list.filter((a) => a.id !== id);
  await setAccounts(next);
  const def = await getDefaultSmtpId();
  if (def === id) {
    await AsyncStorage.setItem(DEFAULT_KEY, next[0] ? next[0].id : '');
  }
  return next;
}

export async function getSmtpAccount(id) {
  const list = await getSmtpAccounts();
  return list.find((a) => a.id === id) || null;
}

export async function getDefaultSmtpId() {
  try {
    await migrateLegacy();
    const saved = await AsyncStorage.getItem(DEFAULT_KEY);
    if (saved) return saved;
    const list = await getSmtpAccounts();
    return list[0] ? list[0].id : '';
  } catch {
    return '';
  }
}

export async function setDefaultSmtpId(id) {
  await AsyncStorage.setItem(DEFAULT_KEY, id || '');
}

export async function getSmtpConfig() {
  const list = await getSmtpAccounts();
  const def = await getDefaultSmtpId();
  const configured = list.filter(smtpIsConfigured).sort((a, b) => (a.id === def ? -1 : b.id === def ? 1 : 0));
  if (configured.length) return configured[0];
  const account = list.find((a) => a.id === def) || list[0];
  return account ? { ...account } : { ...defaultSmtpConfig };
}

export async function saveSmtpConfig(c) {
  const list = await getSmtpAccounts();
  const cleaned = cleanAccount({ ...c });
  if (list.some((a) => a.id === cleaned.id)) {
    const idx = list.findIndex((a) => a.id === cleaned.id);
    list[idx] = cleaned;
  } else {
    list.unshift(cleaned);
  }
  await setAccounts(list);
  await AsyncStorage.setItem(DEFAULT_KEY, cleaned.id);
  return cleaned;
}