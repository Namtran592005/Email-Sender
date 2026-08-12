import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, fonts, radii, shadows, spacing, typography } from '../theme';

export default function AccountPickerModal({ visible, accounts, selectedId, onSelect, onConfirm, onClose }) {
  const confirmable = accounts.some((a) => a.id === selectedId);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <MaterialIcons name="keyboard-arrow-down" size={26} color={palette.ink} />
          </Pressable>
          <Text style={styles.title}>Send from</Text>
          <View style={{ width: 34 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>
            Choose which SMTP account should send this letter. The default account is preselected.
          </Text>
          {accounts.map((a) => {
            const active = a.id === selectedId;
            return (
              <Pressable key={a.id} style={[styles.item, active && styles.itemActive]} onPress={() => onSelect(a.id)}>
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.itemName} numberOfLines={1}>{a.name || a.fromEmail || 'Account'}</Text>
                  <Text style={styles.itemEmail} numberOfLines={1}>{a.fromEmail}</Text>
                  <Text style={styles.itemHost} numberOfLines={1}>
                    {a.host}:{a.port} · {a.user}
                  </Text>
                </View>
                <MaterialIcons
                  name={active ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={active ? palette.info : palette.muted}
                />
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            style={[styles.sendBtn, !confirmable && styles.sendBtnDisabled]}
            onPress={onConfirm}
            disabled={!confirmable}
          >
            <MaterialIcons name="send" size={15} color="#FFFFFF" />
            <Text style={styles.sendText}>Send with selected account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
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
  content: { padding: spacing(5), paddingBottom: spacing(4) },
  hint: {
    ...typography.caption,
    color: palette.mutedStrong,
    lineHeight: 18,
    marginBottom: spacing(4),
  },
  flexOne: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(4),
    marginBottom: spacing(3),
    ...shadows.soft,
  },
  itemActive: { borderColor: palette.info },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: palette.info },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.info },
  itemName: { ...typography.subtitle, fontSize: 15 },
  itemEmail: { ...typography.caption, color: palette.mutedStrong, marginTop: 2 },
  itemHost: { ...typography.caption, color: palette.muted, marginTop: 2 },
  footer: {
    padding: spacing(5),
    paddingTop: spacing(3),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    backgroundColor: palette.surface,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingVertical: 14,
    ...shadows.soft,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15 },
});