import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = [
  '@email_sender/smtp_accounts',
  '@email_sender/smtp_default_id',
  '@email_sender/smtp_config',
  '@email_sender/drafts',
  '@email_sender/last_draft_id',
  '@email_sender/sent',
  '@email_sender/custom_templates',
  '@email_sender/default_template',
];

export async function clearAllData() {
  await AsyncStorage.multiRemove(KEYS);
}
