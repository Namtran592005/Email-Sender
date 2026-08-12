import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { palette } from '../theme';

const groups = [
  [
    { action: 'bold', icon: 'format-bold', label: 'Bold' },
    { action: 'italic', icon: 'format-italic', label: 'Italic' },
    { action: 'underline', icon: 'format-underlined', label: 'Underline' },
    { action: 'strike', icon: 'format-strikethrough', label: 'Strikethrough' },
    { action: 'h2', icon: 'title', label: 'Heading' },
  ],
  [
    { action: 'ul', icon: 'format-list-bulleted', label: 'Bullet list' },
    { action: 'ol', icon: 'format-list-numbered', label: 'Numbered list' },
    { action: 'quote', icon: 'format-quote', label: 'Quote' },
    { action: 'link', icon: 'link', label: 'Link' },
    { action: 'color', icon: 'palette', label: 'Text color' },
  ],
  [{ action: 'undo', icon: 'undo', label: 'Undo' }, { action: 'clear', icon: 'format-clear', label: 'Clear formatting' }],
];

const TOGGLES = ['bold', 'italic', 'underline', 'strike', 'h2', 'ul', 'ol', 'quote'];

export default function Toolbar({ onAction, states }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.wrap}
      contentContainerStyle={styles.content}
    >
      {groups.map((group, gi) => (
        <View key={gi} style={styles.group}>
          {gi > 0 ? <View style={styles.sep} /> : null}
          {group.map((item) => {
            const active = TOGGLES.includes(item.action) && !!states?.[item.action];
            return (
              <Pressable
                key={item.action}
                style={({ pressed }) => [
                  styles.btn,
                  pressed && styles.btnPressed,
                  active && styles.btnActive,
                ]}
                onPress={() => onAction(item.action)}
                hitSlop={4}
                accessibilityLabel={item.label}
                accessibilityState={active ? { selected: true } : {}}
              >
                <MaterialIcons
                  name={item.icon}
                  size={20}
                  color={active ? '#FFFFFF' : palette.ink}
                />
                {active ? <View style={styles.activeDot} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  content: { alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  group: { flexDirection: 'row', alignItems: 'center' },
  sep: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: palette.hairline, marginHorizontal: 3 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  btnPressed: {
    backgroundColor: palette.bgSoft,
  },
  btnActive: {
    backgroundColor: palette.ink,
    borderWidth: 1,
    borderColor: palette.ink,
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});