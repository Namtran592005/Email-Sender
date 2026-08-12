import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CodeEditor from './CodeEditor';
import { useToast } from './Toast';
import {
  deleteCustomTemplate,
  getCustomTemplates,
  getAllTemplates,
  getDefaultTemplateId,
  saveCustomTemplate,
  setDefaultTemplateId,
} from '../templates';
import { palette, fonts, radii, spacing, typography } from '../theme';

export default function TemplateLibrary({ visible, selectedId, onClose, onSelect }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [defaultId, setDefaultId] = useState('');
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    const [tpls, def] = await Promise.all([getAllTemplates(), getDefaultTemplateId()]);
    setList(tpls);
    setDefaultId(def);
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const handleSelect = async (t) => {
    onSelect && onSelect(t);
    onClose && onClose();
  };

  const handleSetDefault = async (id) => {
    await setDefaultTemplateId(id);
    setDefaultId(id);
    toast({ type: 'success', message: 'Default template updated.' });
  };

  const handleDelete = async (t) => {
    await deleteCustomTemplate(t.id);
    await refresh();
  };

  const startCreate = () => setEditing({ id: null, name: '', bodyHtml: '' });
  const startEdit = (t) => setEditing({ ...t });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    const saved = await saveCustomTemplate(editing);
    toast({ type: 'success', message: 'Template saved.' });
    setEditing(null);
    await refresh();
    if (selectedId === saved.id) onSelect && onSelect(saved);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {!editing ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Templates</Text>
              <View style={styles.headerRight}>
                <Pressable style={styles.newBtn} onPress={startCreate} hitSlop={6}>
                  <MaterialIcons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.newBtnText}>New</Text>
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={6}>
                  <MaterialIcons name="close" size={15} color="#FFFFFF" />
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {list.map((t) => {
                const isCustom = !!t.id;
                return (
                  <View key={t.id} style={styles.item}>
                    <Pressable style={styles.itemMain} onPress={() => handleSelect(t)}>
                      <Text style={styles.itemName}>{t.name}</Text>
                      <Text style={styles.itemDesc} numberOfLines={2}>
                        {t.description || (isCustom ? 'Custom template' : '')}
                      </Text>
                    </Pressable>
                    <View style={styles.itemActions}>
                      {defaultId === t.id && (
                        <View style={styles.defaultBadge}>
                          <MaterialIcons name="star" size={12} color={palette.goldDark} />
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                      <Pressable
                        style={styles.smallBtn}
                        onPress={() => handleSetDefault(t.id)}
                        hitSlop={6}
                      >
                        <Text style={styles.smallBtnText}>Default</Text>
                      </Pressable>
                      <Pressable style={styles.smallBtn} onPress={() => handleSelect(t)} hitSlop={6}>
                        <Text style={styles.smallBtnPrimary}>Use</Text>
                      </Pressable>
                      {isCustom && (
                        <>
                          <Pressable style={styles.smallBtn} onPress={() => startEdit(t)} hitSlop={6}>
                            <Text style={styles.smallBtnText}>Edit</Text>
                          </Pressable>
                          <Pressable style={styles.smallBtn} onPress={() => handleDelete(t)} hitSlop={6}>
                            <Text style={styles.smallBtnDanger}>Delete</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
              {list.length === 0 && (
                <Text style={styles.empty}>No templates yet. Tap “New” to paste some HTML.</Text>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{editing.id ? 'Edit template' : 'New template'}</Text>
              <View style={styles.headerRight}>
                <Pressable style={styles.saveBtn} onPress={saveEdit} hitSlop={6}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={cancelEdit} hitSlop={6}>
                  <MaterialIcons name="close" size={15} color="#FFFFFF" />
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.editorWrap}>
              <TextInput
                style={styles.nameInput}
                value={editing.name}
                onChangeText={(v) => setEditing((p) => ({ ...p, name: v }))}
                placeholder="Template name"
                placeholderTextColor={palette.muted}
                autoCapitalize="sentences"
              />
              <Text style={styles.hint}>Paste the HTML below. It becomes the editable letter body.</Text>
              <CodeEditor
                style={styles.code}
                initialValue={editing.bodyHtml}
                onChange={(v) => setEditing((p) => ({ ...p, bodyHtml: v }))}
              />
            </View>
          </>
        )}
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
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  title: { ...typography.subtitle, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(4),
    paddingVertical: 8,
  },
  newBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
  saveBtn: {
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
  list: { padding: spacing(5), paddingTop: spacing(2), paddingBottom: spacing(10) },
  item: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(4),
    marginBottom: spacing(3),
  },
  itemMain: { flex: 1, marginBottom: spacing(2) },
  itemName: { ...typography.subtitle, fontSize: 16, marginBottom: 4 },
  itemDesc: { ...typography.caption, color: palette.mutedStrong, lineHeight: 17 },
  itemActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing(2) },
  smallBtn: {
    paddingHorizontal: spacing(3),
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.surfaceAlt,
  },
  smallBtnText: { ...typography.small, color: palette.mutedStrong },
  smallBtnPrimary: { ...typography.small, color: palette.info },
  smallBtnDanger: { ...typography.small, color: palette.error },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.goldBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 6,
  },
  defaultBadgeText: { ...typography.small, color: palette.goldDark },
  empty: { ...typography.caption, textAlign: 'center', marginTop: spacing(8), color: palette.muted },
  editorWrap: { flex: 1, paddingHorizontal: spacing(3) },
  nameInput: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: 11,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.surface,
    fontFamily: fonts.regular,
    marginBottom: spacing(2),
  },
  hint: { ...typography.caption, color: palette.mutedStrong, marginBottom: spacing(2), lineHeight: 17 },
  code: {
    flex: 1,
    minHeight: 300,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#3C3C3C',
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginBottom: spacing(4),
  },
});