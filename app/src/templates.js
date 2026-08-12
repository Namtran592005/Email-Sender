import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_KEY = '@email_sender/custom_templates';
const DEFAULT_KEY = '@email_sender/default_template';

export async function getCustomTemplates() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function setCustomTemplates(list) {
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export async function saveCustomTemplate({ id, name, bodyHtml }) {
  const list = await getCustomTemplates();
  const trimmedName = String(name || '').trim() || 'Untitled';
  const payload = {
    id: id || `t${Date.now()}`,
    name: trimmedName,
    bodyHtml: String(bodyHtml || ''),
    updatedAt: new Date().toISOString(),
  };
  const idx = list.findIndex((t) => t.id === payload.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...payload };
  else list.unshift(payload);
  await setCustomTemplates(list);
  return payload;
}

export async function deleteCustomTemplate(id) {
  const list = await getCustomTemplates();
  await setCustomTemplates(list.filter((t) => t.id !== id));
  const def = await getDefaultTemplateId();
  if (def === id) await AsyncStorage.removeItem(DEFAULT_KEY);
}

export async function getDefaultTemplateId() {
  try {
    return (await AsyncStorage.getItem(DEFAULT_KEY)) || '';
  } catch {
    return '';
  }
}

export async function setDefaultTemplateId(id) {
  await AsyncStorage.setItem(DEFAULT_KEY, String(id || ''));
}

export async function getTemplateById(id) {
  const customs = await getCustomTemplates();
  return customs.find((t) => t.id === id) || null;
}

export async function getAllTemplates() {
  return getCustomTemplates();
}

export async function resolveDefaultTemplate() {
  return null;
}
