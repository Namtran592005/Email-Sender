import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addSmtpAccount,
  defaultSmtpConfig,
  deleteSmtpAccount,
  getDefaultSmtpId,
  getSmtpAccounts,
  setDefaultSmtpId,
  updateSmtpAccount,
} from '../smtpConfig';
import { testConnection } from '../smtp';
import { clearAllData } from '../clearData';
import { useToast } from '../components/Toast';
import { palette, fonts, radii, shadows, spacing, typography, glass } from '../theme';

function Field({ label, value, onChange, placeholder, secure, keyboardType, style }) {
  return (
    <View style={[styles.field, style]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        accessibilityLabel={label}
      />
    </View>
  );
}

function GroupLabel({ children }) {
  return <Text style={styles.groupLabel}>{children}</Text>;
}

function AccountEditor({ account, onSave, onClose, onTest, testing }) {
  const [draft, setDraft] = useState({ ...defaultSmtpConfig, ...account });
  const setField = (key) => (value) => setDraft((p) => ({ ...p, [key]: value }));

  const submit = () => {
    if (!draft.host.trim() || !draft.fromEmail.trim()) return;
    onSave(draft);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{account && account.id ? 'Edit account' : 'New account'}</Text>
          <View style={styles.modalHeaderRight}>
            <Pressable style={styles.modalSaveBtn} onPress={submit} disabled={testing} hitSlop={6}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={6}>
              <MaterialIcons name="close" size={18} color="#FFFFFF" />
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GroupLabel>Server</GroupLabel>
            <Field label="Host" value={draft.host} onChange={setField('host')} placeholder="smtp.gmail.com" />
            <Field label="Port" value={draft.port} onChange={setField('port')} placeholder="465" keyboardType="number-pad" />
            <View style={styles.tlsRow}>
              <Text style={styles.tlsText}>TLS / SMTPS</Text>
              <Switch
                value={draft.tls}
                onValueChange={setField('tls')}
                trackColor={{ false: palette.hairline, true: palette.info }}
                thumbColor="#FFFFFF"
              />
            </View>

            <GroupLabel>Auth</GroupLabel>
            <Field label="Username" value={draft.user} onChange={setField('user')} placeholder="you@gmail.com" />
            <Field label="Password" value={draft.pass} onChange={setField('pass')} placeholder="App password" secure />

            <GroupLabel>Sender</GroupLabel>
            <Field label="Sender name" value={draft.fromName} onChange={setField('fromName')} placeholder="Personal Letter" />
            <Field label="Sender email" value={draft.fromEmail} onChange={setField('fromEmail')} placeholder="from@example.com" keyboardType="email-address" />

            <Pressable style={styles.testBtn} onPress={() => onTest(draft)} disabled={testing} hitSlop={6}>
              {testing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.testText}>Test connection</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [defaultId, setDefaultId] = useState('');
  const [editing, setEditing] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refresh = async () => {
    const [list, defId] = await Promise.all([getSmtpAccounts(), getDefaultSmtpId()]);
    setAccounts(list);
    setDefaultId(defId);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSaveAccount = async (draft) => {
    try {
      const isNew = !draft.id;
      if (isNew) await addSmtpAccount(draft);
      else await updateSmtpAccount(draft.id, draft);
      await refresh();
      setEditing(null);
      toast({ type: 'success', message: isNew ? 'Account added.' : 'Account updated.' });
    } catch (e) {
      toast({ type: 'error', message: e.message });
    }
  };

  const handleTest = async (draft) => {
    setTesting(true);
    try {
      await testConnection({ ...defaultSmtpConfig, ...draft });
      toast({ type: 'success', message: 'Connection works.' });
    } catch (e) {
      toast({ type: 'error', message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleMakeDefault = async (id) => {
    await setDefaultSmtpId(id);
    setDefaultId(id);
  };

  const handleDelete = async (id) => {
    const next = await deleteSmtpAccount(id);
    setAccounts(next);
    if (defaultId === id) setDefaultId(next[0] ? next[0].id : '');
    toast({ type: 'success', message: 'Account removed.' });
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAllData();
      setAccounts([]);
      setDefaultId('');
      setClearOpen(false);
      toast({ type: 'success', message: 'All data deleted.' });
    } catch (e) {
      toast({ type: 'error', message: e.message });
    } finally {
      setClearing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!accounts.length) {
        toast({ type: 'info', message: 'Add an SMTP account to send mail.' });
      } else {
        toast({ type: 'success', message: 'Saved.' });
      }
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.replace('Home');
    } catch (e) {
      toast({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressGlassActive]}
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack();
                  else navigation.replace('Home');
                }}
                hitSlop={6}
              >
                <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
              </Pressable>
              <Text style={styles.title}>Settings</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => setEditing({})} hitSlop={6}>
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.card}>
              <Pressable style={styles.emptyAdd} onPress={() => setEditing({})} hitSlop={6}>
                <MaterialIcons name="add-circle-outline" size={20} color={palette.info} />
                <Text style={styles.emptyAddText}>Add your first SMTP account</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.accList}>
              {accounts.map((a) => {
                const isDefault = a.id === defaultId;
                const ready = a.host && a.user && a.fromEmail;
                return (
                  <View key={a.id} style={[styles.accItem, isDefault && styles.accItemDefault]}>
                    <View style={styles.accIcon}>
                      <MaterialIcons name={isDefault ? 'star' : 'email'} size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.flexOne}>
                      <View style={styles.accNameRow}>
                        <Text style={styles.accName} numberOfLines={1}>
                          {a.name || a.fromEmail || 'Account'}
                        </Text>
                        {!ready && <Text style={styles.incompleteDot} />}
                      </View>
                      <Text style={styles.accMeta} numberOfLines={1}>{a.fromEmail || a.host}</Text>
                    </View>
                    <View style={styles.accTrailing}>
                      {!isDefault && (
                        <Pressable style={styles.iconBtn} onPress={() => handleMakeDefault(a.id)} hitSlop={6}>
                          <MaterialIcons name="star-outline" size={20} color={palette.mutedStrong} />
                        </Pressable>
                      )}
                      <Pressable style={styles.iconBtn} onPress={() => setEditing(a)} hitSlop={6}>
                        <MaterialIcons name="edit" size={20} color={palette.info} />
                      </Pressable>
                      <Pressable style={styles.iconBtn} onPress={() => handleDelete(a.id)} hitSlop={6}>
                        <MaterialIcons name="delete-outline" size={20} color={palette.error} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <Pressable style={styles.inlineAdd} onPress={() => setEditing({})} hitSlop={6}>
                <MaterialIcons name="add" size={18} color={palette.info} />
                <Text style={styles.inlineAddText}>Add account</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.section}>About</Text>
          <Text style={styles.aboutText}>
            Email Sender lets you write letters with a rich editor, pick a template, and send them
            straight from your SMTP account.
          </Text>

          <Text style={styles.section}>Danger zone</Text>
          <View style={styles.card}>
            <Text style={styles.dangerDesc}>
              Removes all SMTP accounts, templates, drafts, and sent history from this device.
            </Text>
            <Pressable style={styles.dangerBtn} onPress={() => setClearOpen(true)} hitSlop={6}>
              <MaterialIcons name="delete-forever" size={16} color={palette.error} />
              <Text style={styles.dangerBtnText}>Delete all data</Text>
            </Pressable>
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {editing && (
        <AccountEditor
          account={editing}
          onSave={handleSaveAccount}
          onClose={() => setEditing(null)}
          onTest={handleTest}
          testing={testing}
        />
      )}

      <Modal visible={clearOpen} transparent animationType="fade" onRequestClose={() => setClearOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <MaterialIcons name="warning" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.confirmTitle}>Delete all data?</Text>
            <Text style={styles.confirmDesc}>
              This permanently removes every SMTP account, template, draft, and sent email from this device. This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnGhost]}
                onPress={() => setClearOpen(false)}
                disabled={clearing}
              >
                <Text style={styles.confirmBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnDanger]}
                onPress={handleClearAll}
                disabled={clearing}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnDangerText}>Delete all</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  content: { padding: spacing(5), paddingTop: spacing(3), paddingBottom: spacing(10) },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(4),
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: glass.border,
    ...shadows.card,
  },
  pressGlassActive: { backgroundColor: glass.activeFill },
  title: { ...typography.largeTitle },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: 8,
  },
  addBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
  section: {
    ...typography.subtitle,
    fontSize: 15,
    marginTop: spacing(5),
    marginBottom: spacing(3),
    color: palette.ink,
  },
  aboutText: {
    ...typography.body,
    color: palette.mutedStrong,
    lineHeight: 22,
    paddingHorizontal: spacing(1),
  },
  dangerDesc: {
    ...typography.caption,
    color: palette.mutedStrong,
    lineHeight: 19,
    marginBottom: spacing(3),
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.error,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: 9,
  },
  dangerBtnText: { color: palette.error, fontFamily: fonts.semibold, fontSize: 13 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(5),
    ...shadows.soft,
  },
  accList: { gap: spacing(2), marginTop: spacing(1) },
  accItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(3),
    paddingHorizontal: spacing(4),
    ...shadows.soft,
  },
  accItemDefault: { borderColor: 'rgba(10,132,255,0.5)', borderWidth: 1.5 },
  accIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: { flex: 1 },
  accNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  accName: { ...typography.subtitle, fontSize: 15, flexShrink: 1 },
  incompleteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.error },
  accMeta: { ...typography.caption, color: palette.mutedStrong, marginTop: 1 },
  accTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing(3),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.hairline,
    borderRadius: radii.lg,
  },
  inlineAddText: { ...typography.caption, color: palette.info, fontFamily: fonts.semibold },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing(3),
  },
  emptyAddText: { ...typography.caption, color: palette.info, fontFamily: fonts.semibold },
  field: { marginBottom: spacing(2) },
  groupLabel: {
    ...typography.caption,
    color: palette.mutedStrong,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: spacing(1),
    marginBottom: spacing(2),
  },
  input: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: 11,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.surfaceAlt,
    fontFamily: fonts.regular,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginTop: spacing(5),
    ...shadows.soft,
  },
  primaryText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15 },
  modalSafe: { flex: 1, backgroundColor: palette.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  modalTitle: { ...typography.subtitle, flexShrink: 1 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  modalSaveBtn: {
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: palette.error,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 8,
  },
  closeBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
  modalBody: { padding: spacing(5), paddingTop: spacing(2), paddingBottom: spacing(10) },
  tlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingHorizontal: spacing(3),
    paddingVertical: 8,
    marginBottom: spacing(3),
  },
  tlsText: { ...typography.caption, color: palette.ink, fontFamily: fonts.semibold, fontSize: 13 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: 10,
    marginTop: spacing(3),
    ...shadows.soft,
  },
  testText: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(40,37,34,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(6),
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing(5),
    alignItems: 'center',
    ...shadows.card,
  },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  confirmTitle: { ...typography.subtitle, marginBottom: spacing(2) },
  confirmDesc: {
    ...typography.caption,
    color: palette.mutedStrong,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing(4),
  },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(3), width: '100%' },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radii.pill,
  },
  confirmBtnGhost: { borderWidth: 1, borderColor: palette.hairline },
  confirmBtnGhostText: { color: palette.mutedStrong, fontFamily: fonts.semibold },
  confirmBtnDanger: { backgroundColor: palette.error },
  confirmBtnDangerText: { color: '#FFFFFF', fontFamily: fonts.bold },
});