import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TemplatesTab from './TemplatesTab';
import DraftsTab from './DraftsTab';
import SentTab from './SentTab';
import { palette, fonts, spacing, typography, shadows, glass } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = { Templates: 'description', Drafts: 'drafts', Sent: 'send' };
const TAB_ITEM_WIDTH = 56;
const INDICATOR_SIZE = 62;

function FloatingTabBar({ state, navigation }) {
  const currentIndex = state.index;

  const translateX = useRef(
    new Animated.Value(currentIndex * TAB_ITEM_WIDTH)
  ).current;

  const slide = (toIndex) => {
    Animated.spring(translateX, {
      toValue: toIndex * TAB_ITEM_WIDTH,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
      mass: 0.8,
    }).start();
  };

  useEffect(() => {
    slide(state.index);
  }, [state.index]);

  return (
    <View style={styles.tabBarHost} pointerEvents="box-none">
      <View style={styles.tabBar}>
        <Animated.View
          style={[
            styles.indicator,
            { transform: [{ translateX }] },
          ]}
        >
          <View style={styles.indicatorGlass} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = route.name;
          const onPress = () => {
            if (!isFocused) slide(index);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              accessibilityLabel={`${label} tab`}
              hitSlop={4}
            >
              <MaterialIcons
                name={TAB_ICONS[label]}
                size={22}
                color={isFocused ? palette.info : palette.mutedStrong}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.largeTitle}>Letters</Text>
        <Pressable style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressGlassActive]} onPress={() => navigation.navigate('Settings')} hitSlop={6}>
          <MaterialIcons name="settings" size={22} color={palette.ink} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Tab.Navigator tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Templates" component={TemplatesTab} />
          <Tab.Screen name="Drafts" component={DraftsTab} />
          <Tab.Screen name="Sent" component={SentTab} />
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressGlassActive: { backgroundColor: glass.activeFill },
  tabBarHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: glass.fill,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: glass.border,
    ...shadows.card,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    overflow: 'hidden',
    zIndex: 0,
  },
  indicatorGlass: {
    flex: 1,
    backgroundColor: glass.fillBright,
    borderWidth: 1,
    borderColor: glass.rim,
    borderRadius: INDICATOR_SIZE / 2,
  },
  tabItem: {
    width: TAB_ITEM_WIDTH,
    height: TAB_ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
