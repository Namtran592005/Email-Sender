import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSmtpConfig, smtpIsConfigured } from '../smtpConfig';
import { getAllTemplates, getDefaultTemplateId } from '../templates';
import { palette, fonts, radii, spacing, typography, shadows, glass } from '../theme';

export default function TemplatesTab() {
  const navigation = useNavigation();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [defId, setDefId] = useState('');

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const [smtp, tpls, d] = await Promise.all([getSmtpConfig(), getAllTemplates(), getDefaultTemplateId()]);
        if (!mounted) return;
        setNeedsSetup(!smtpIsConfigured(smtp));
        const sorted = [...tpls].sort((a, b) => (a.id === d ? -1 : b.id === d ? 1 : 0));
        setTemplates(sorted);
        setDefId(d);
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {needsSetup ? (
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>GET STARTED</Text>
          </View>
          <Text style={styles.cardTitle}>Set up delivery</Text>
          <Text style={styles.cardDesc}>
            Add your mail server and credentials to send letters directly from the app.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.hero}>
          <Pressable
            style={({ pressed }) => [styles.heroIcon, pressed && styles.pressGlassActive]}
            onPress={() => navigation.navigate('Sent')}
            accessibilityLabel="Open sent letters"
            hitSlop={8}
          >
            <MaterialIcons name="email" size={34} color={palette.info} />
          </Pressable>
          <Text style={styles.heroTitle}>Your letter is ready</Text>
          <Text style={styles.heroDesc}>
            Write like Gmail — bold, italic, lists, links.
            The letter is sent exactly as you design it.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.composeBtn, pressed && styles.pressGlassActive]}
            onPress={() => navigation.navigate('Compose', {})}
            accessibilityLabel="Compose a letter"
            hitSlop={10}
          >
            <MaterialIcons name="edit" size={28} color={palette.info} />
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Templates</Text>
      <View style={styles.tplList}>
        {templates.map((t) => (
          <Pressable
            key={t.id}
            style={styles.tplItem}
            onPress={() => navigation.navigate('Compose', { templateId: t.id })}
          >
            <View style={styles.tplIcon}>
              <MaterialIcons name="description" size={20} color={palette.info} />
            </View>
            <View style={styles.flexOne}>
              <View style={styles.tplNameRow}>
                <Text style={styles.tplName} numberOfLines={1}>
                  {t.name}
                </Text>
                {defId === t.id && (
                  <View style={styles.defaultBadge}>
                    <MaterialIcons name="star" size={11} color={palette.goldDark} />
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tplDesc} numberOfLines={1}>
                {t.description || 'Custom template'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={palette.muted} />
          </Pressable>
        ))}
        {templates.length === 0 && (
          <Text style={styles.emptyText}>No templates yet. Open Compose and save one.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  content: { 
    padding: spacing(5), 
    paddingTop: spacing(3), 
    paddingBottom: spacing(24) 
  },
  hero: { 
    alignItems: 'center', 
    paddingTop: spacing(6), 
    paddingHorizontal: spacing(4) 
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(5),
    ...shadows.card,
  },
  heroTitle: { 
    ...typography.title, 
    textAlign: 'center', 
    marginBottom: spacing(3) 
  },
  heroDesc: {
    ...typography.caption,
    color: palette.mutedStrong,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing(7),
    maxWidth: 320,
  },
  composeBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressGlassActive: { backgroundColor: glass.activeFill },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing(8),
  },
  primaryBtnText: { 
    color: palette.info, 
    fontSize: 16, 
    fontFamily: fonts.bold, 
    letterSpacing: 0.2 
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing(5),
    ...shadows.card,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: 4,
    marginBottom: spacing(3),
  },
  badgeText: { 
    ...typography.small, 
    color: palette.mutedStrong, 
    letterSpacing: 1 
  },
  cardTitle: { 
    ...typography.subtitle, 
    marginBottom: spacing(2) 
  },
  cardDesc: {
    ...typography.caption,
    color: palette.mutedStrong,
    lineHeight: 20,
    marginBottom: spacing(5),
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 15,
    marginTop: spacing(7),
    marginBottom: spacing(3),
  },
  tplList: { 
    gap: spacing(2)  // ⚠️ Có thể vẫn còn lỗi ở đây!
  },
  tplItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    ...shadows.soft,
  },
  tplIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(3),
  },
  tplNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 2,
  },
  tplName: { 
    ...typography.subtitle, 
    fontSize: 15,
    flexShrink: 1,
    marginRight: spacing(2),
  },
  tplDesc: { 
    ...typography.caption, 
    color: palette.mutedStrong,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.goldBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  defaultBadgeText: { 
    ...typography.small, 
    fontSize: 10, 
    color: palette.goldDark,
    marginLeft: 2,
  },
  emptyText: { 
    ...typography.caption, 
    color: palette.muted, 
    paddingVertical: spacing(2) 
  },
});