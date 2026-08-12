import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFTS_KEY = '@email_sender/drafts';
const LAST_DRAFT_KEY = '@email_sender/last_draft_id';
const MAX_DRAFTS = 20;

const id = () => `d${Date.now()}${Math.floor(Math.random() * 1e4)}`;

export async function getDrafts() {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function setDrafts(list) {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
}

export async function getDraft(draftId) {
  if (!draftId) return null;
  const list = await getDrafts();
  return list.find((d) => d.id === draftId) || null;
}

export async function getLastDraftId() {
  try {
    return (await AsyncStorage.getItem(LAST_DRAFT_KEY)) || null;
  } catch {
    return null;
  }
}

export async function setLastDraftId(draftId) {
  try {
    if (draftId) await AsyncStorage.setItem(LAST_DRAFT_KEY, draftId);
    else await AsyncStorage.removeItem(LAST_DRAFT_KEY);
  } catch {}
}

export async function saveDraft(input) {
  const list = await getDrafts();
  const existingId = input.id;
  const now = new Date().toISOString();
  let next;
  const idx = existingId ? list.findIndex((d) => d.id === existingId) : -1;
  if (idx >= 0) {
    next = { ...list[idx], ...input, id: existingId, updatedAt: now };
    list.splice(idx, 1);
  } else {
    next = {
      id: existingId || id(),
      to: String((input && input.to) || ''),
      cc: Array.isArray(input && input.cc) ? input.cc : [],
      bcc: Array.isArray(input && input.bcc) ? input.bcc : [],
      subject: String((input && input.subject) || ''),
      bodyHtml: String((input && input.bodyHtml) || ''),
      attachments: Array.isArray(input && input.attachments) ? input.attachments : [],
      updatedAt: now,
    };
  }
  const newList = [next, ...list].slice(0, MAX_DRAFTS);
  await setDrafts(newList);
  if (next.id) await setLastDraftId(next.id);
  return next;
}

export async function deleteDraft(draftId) {
  if (!draftId) return;
  const list = await getDrafts();
  await setDrafts(list.filter((d) => d.id !== draftId));
  const last = await getLastDraftId();
  if (last === draftId) await setLastDraftId(null);
}

export async function clearDrafts() {
  await AsyncStorage.removeItem(DRAFTS_KEY);
  await AsyncStorage.removeItem(LAST_DRAFT_KEY);
}