import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, fonts, radii, spacing, typography, shadows } from '../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_COLOR = {
  cc: palette.info,
  bcc: palette.goldDark,
};

export default function CcBccModal({ visible, cc, bcc, onChange, onClose }) {
  const [ccValue, setCcValue] = useState('');
  const [bccValue, setBccValue] = useState('');
  const [draftCc, setDraftCc] = useState([]);
  const [draftBcc, setDraftBcc] = useState([]);
  const [bulkType, setBulkType] = useState(null);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    if (visible) {
      setDraftCc(Array.isArray(cc) ? cc : []);
      setDraftBcc(Array.isArray(bcc) ? bcc : []);
      setCcValue('');
      setBccValue('');
      setBulkType(null);
      setBulkText('');
    }
  }, [visible, cc, bcc]);

  const addEmail = (type, value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) return;
    if (type === 'cc') {
      if (!draftCc.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
        setDraftCc((p) => [...p, trimmed]);
      }
      setCcValue('');
    } else {
      if (!draftBcc.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
        setDraftBcc((p) => [...p, trimmed]);
      }
      setBccValue('');
    }
    Keyboard.dismiss();
  };

  const openBulk = (type) => {
    setBulkType(type);
    setBulkText('');
  };

  const applyBulk = () => {
    const lines = bulkText
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const valid = [...new Set(lines.filter((s) => EMAIL_RE.test(s)))];
    const target = bulkType;
    const existing = target === 'cc' ? draftCc : draftBcc;
    const merged = [...existing];
    valid.forEach((email) => {
      if (!merged.some((e) => e.toLowerCase() === email.toLowerCase())) merged.push(email);
    });
    if (target === 'cc') setDraftCc(merged);
    else setDraftBcc(merged);
    setBulkType(null);
    setBulkText('');
  };

  const removeEmail = (type, email) => {
    if (type === 'cc') setDraftCc((p) => p.filter((e) => e !== email));
    else setDraftBcc((p) => p.filter((e) => e !== email));
  };

  const done = () => {
    onChange(draftCc, draftBcc);
    onClose();
  };

  const renderSection = (type, title, value, setValue, emails) => {
    const color = EMAIL_COLOR[type];
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Pressable style={styles.bulkBtn} onPress={() => openBulk(type)} hitSlop={6}>
            <MaterialIcons name="content-paste" size={15} color={palette.info} />
            <Text style={styles.bulkBtnText}>Paste list</Text>
          </Pressable>
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="email@example.com"
            placeholderTextColor={palette.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addEmail(type, value)}
          />
          <Pressable
            style={[styles.addBtn, { backgroundColor: color }]}
            onPress={() => addEmail(type, value)}
            hitSlop={4}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {emails.length > 0 ? (
          <View style={styles.chips}>
            {emails.map((email) => (
              <View key={email} style={[styles.chip, { borderColor: color }]}>
                <Text style={styles.chipText} numberOfLines={1}>{email}</Text>
                <Pressable onPress={() => removeEmail(type, email)} hitSlop={8}>
                  <MaterialIcons name="close" size={15} color={palette.mutedStrong} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>Add one or more {type === 'cc' ? 'CC' : 'BCC'} email addresses.</Text>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <MaterialIcons name="keyboard-arrow-down" size={26} color={palette.ink} />
            </Pressable>
            <Text style={styles.title}>CC / BCC</Text>
            <Pressable style={styles.doneBtn} onPress={done} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.hint}>
              Recipients on CC are visible to everyone. BCC recipients stay hidden.
            </Text>
            {renderSection('cc', 'CC', ccValue, setCcValue, draftCc)}
            {renderSection('bcc', 'BCC', bccValue, setBccValue, draftBcc)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={bulkType !== null} transparent animationType="fade" onRequestClose={() => setBulkType(null)}>
        <View style={styles.bulkOverlay}>
          <View style={styles.bulkCard}>
            <Text style={styles.bulkTitle}>Paste {bulkType === 'cc' ? 'CC' : 'BCC'} list</Text>
            <Text style={styles.bulkSubtitle}>One email per line (or separated by commas).</Text>
            <TextInput
              style={styles.bulkInput}
              value={bulkText}
              onChangeText={setBulkText}
              placeholder="alice@example.com&#10;bob@example.com&#10;carol@example.com"
              placeholderTextColor={palette.muted}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textAlignVertical="top"
            />
            <View style={styles.bulkActions}>
              <Pressable style={styles.bulkCancel} onPress={() => setBulkType(null)} hitSlop={6}>
                <Text style={styles.bulkCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.bulkApply} onPress={applyBulk} hitSlop={6}>
                <Text style={styles.bulkApplyText}>Add emails</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.subtitle, fontSize: 16 },
  doneBtn: {
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: 8,
  },
  doneText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  hint: {
    ...typography.caption,
    color: palette.mutedStrong,
    lineHeight: 18,
    marginBottom: spacing(5),
  },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  sectionTitle: { ...typography.subtitle, fontSize: 15 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3),
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing(2),
    paddingVertical: 6,
  },
  bulkBtnText: { color: palette.info, fontFamily: fonts.semibold, fontSize: 13 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: 10,
    fontSize: 14,
    color: palette.ink,
    backgroundColor: palette.surfaceAlt,
    fontFamily: fonts.regular,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(3) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 6,
    maxWidth: '100%',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: palette.ink,
    maxWidth: 220,
  },
  emptyHint: { ...typography.caption, marginTop: spacing(3) },
  bulkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(5),
  },
  bulkCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    padding: spacing(5),
    ...shadows.soft,
  },
  bulkTitle: { ...typography.subtitle, marginBottom: spacing(2) },
  bulkSubtitle: { ...typography.caption, color: palette.mutedStrong, lineHeight: 18, marginBottom: spacing(3) },
  bulkInput: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
    padding: spacing(3),
    fontSize: 14,
    fontFamily: fonts.regular,
    color: palette.ink,
    minHeight: 140,
  },
  bulkActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(3), marginTop: spacing(4) },
  bulkCancel: {
    paddingHorizontal: spacing(4),
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  bulkCancelText: { color: palette.ink, fontFamily: fonts.semibold, fontSize: 13 },
  bulkApply: {
    backgroundColor: palette.info,
    paddingHorizontal: spacing(4),
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  bulkApplyText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
});