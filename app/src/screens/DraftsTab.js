import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { deleteDraft, getDrafts } from '../drafts';
import { useToast } from '../components/Toast';
import { palette, fonts, radii, spacing, typography, shadows } from '../theme';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function DraftsTab() {
  const navigation = useNavigation();
  const toast = useToast();
  const [drafts, setDrafts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const list = await getDrafts();
        if (!mounted) return;
        setDrafts(list);
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const removeDraft = async (id) => {
    await deleteDraft(id);
    setDrafts((list) => list.filter((d) => d.id !== id));
    toast({ type: 'success', message: 'Draft deleted.' });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Drafts</Text>
      {drafts.length === 0 ? (
        <View style={styles.sentEmpty}>
          <MaterialIcons name="drafts" size={22} color={palette.muted} />
          <Text style={styles.emptyText}>No drafts saved.</Text>
        </View>
      ) : (
        <View style={styles.sentList}>
          {drafts.map((d) => (
            <Pressable
              key={d.id}
              style={styles.sentItem}
              onPress={() => navigation.navigate('Compose', { draftId: d.id })}
            >
              <View style={styles.flexOne}>
                <Text style={styles.sentSubject} numberOfLines={1}>
                  {d.subject || '(no subject)'}
                </Text>
                <Text style={styles.sentMeta} numberOfLines={1}>
                  {stripHtml(d.bodyHtml).slice(0, 60) || `To ${d.to || '—'}`} · {formatDate(d.updatedAt)}
                </Text>
                {Array.isArray(d.attachments) && d.attachments.length > 0 && (
                  <Text style={[styles.sentMeta, { marginTop: 2 }]} numberOfLines={1}>
                    {d.attachments.length} attached file{d.attachments.length > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => removeDraft(d.id)} hitSlop={8} style={styles.itemDelete}>
                <MaterialIcons name="close" size={18} color={palette.mutedStrong} />
              </Pressable>
              <MaterialIcons name="chevron-right" size={22} color={palette.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  content: { padding: spacing(5), paddingTop: spacing(3), paddingBottom: spacing(24) },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 15,
    marginBottom: spacing(3),
  },
  sentEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(2),
  },
  emptyText: { ...typography.caption, color: palette.muted, paddingVertical: spacing(2) },
  sentList: { gap: spacing(2) },
  sentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(3),
    paddingHorizontal: spacing(4),
    ...shadows.soft,
  },
  sentSubject: { ...typography.subtitle, fontSize: 15 },
  sentMeta: { ...typography.caption, color: palette.mutedStrong, marginTop: 2 },
  itemDelete: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
