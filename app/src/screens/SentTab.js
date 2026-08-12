import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { getSentEmails, removeSentEmail } from '../sent';
import { useToast } from '../components/Toast';
import { palette, fonts, radii, spacing, typography, shadows } from '../theme';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function SentTab() {
  const toast = useToast();
  const [sent, setSent] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const list = await getSentEmails();
        if (!mounted) return;
        setSent(list);
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const deleteSent = async (id) => {
    setDeleting(true);
    try {
      await removeSentEmail(id);
      setSent((list) => list.filter((x) => x.id !== id));
      if (viewing && viewing.id === id) setViewing(null);
      toast({ type: 'success', message: 'Removed from sent list.' });
    } catch {
      toast({ type: 'error', message: 'Could not remove the email.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Sent</Text>
        {sent.length === 0 ? (
          <View style={styles.sentEmpty}>
            <MaterialIcons name="send" size={22} color={palette.muted} />
            <Text style={styles.emptyText}>Nothing sent yet.</Text>
          </View>
        ) : (
          <View style={styles.sentList}>
            {sent.map((s) => (
              <Pressable key={s.id} style={styles.sentItem} onPress={() => setViewing(s)}>
                <View style={styles.flexOne}>
                  <Text style={styles.sentSubject} numberOfLines={1}>
                    {s.subject}
                  </Text>
                  <Text style={styles.sentMeta} numberOfLines={1}>
                    {s.to} · {formatDate(s.date)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={palette.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!viewing}
        animationType="slide"
        onRequestClose={() => setViewing(null)}
      >
        {viewing && (
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.closeBtn} onPress={() => setViewing(null)} hitSlop={8}>
                <MaterialIcons name="keyboard-arrow-down" size={26} color={palette.ink} />
              </Pressable>
              <View style={styles.flexOne}>
                <Text style={styles.detailSubject} numberOfLines={1}>
                  {viewing.subject}
                </Text>
                <Text style={styles.detailMeta} numberOfLines={1}>
                  To {viewing.to} · {formatDate(viewing.date)}
                </Text>
                {Array.isArray(viewing.attachments) && viewing.attachments.length > 0 && (
                  <Text style={styles.detailMeta} numberOfLines={1}>
                    Attachments: {viewing.attachments.map((a) => a.name).join(', ')}
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.detailDelete}
                onPress={() => deleteSent(viewing.id)}
                disabled={deleting}
                hitSlop={8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={palette.error} />
                ) : (
                  <MaterialIcons name="delete-outline" size={22} color={palette.error} />
                )}
              </Pressable>
            </View>
            <WebView
              style={styles.detailBody}
              originWhitelist={['*']}
              source={{ html: viewing.html }}
              showsVerticalScrollIndicator={false}
            />
          </SafeAreaView>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
    backgroundColor: palette.surface,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSubject: { ...typography.subtitle, fontSize: 15 },
  detailMeta: { ...typography.caption, color: palette.mutedStrong, marginTop: 2 },
  detailDelete: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: { flex: 1, backgroundColor: palette.bg },
});
