import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSmtpAccounts, smtpIsConfigured } from './src/smtpConfig';
import { ToastProvider } from './src/components/Toast';
import ComposeScreen from './src/screens/ComposeScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { palette } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.bg,
    card: palette.surface,
    text: palette.ink,
    border: 'transparent',
    primary: palette.info,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [hasSmtp, setHasSmtp] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const opacity = useRef(new Animated.Value(0)).current;
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const accounts = await getSmtpAccounts();
        setHasSmtp(accounts.some(smtpIsConfigured));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (ready && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      setFadeIn(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [ready, fontsLoaded, opacity]);

  const onReady = useCallback(() => {}, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Animated.View style={[styles.flex, { opacity: fadeIn ? opacity : 0 }]}>
          <NavigationContainer theme={appTheme} onReady={onReady}>
            <StatusBar style="dark" />
            <Stack.Navigator
              initialRouteName={hasSmtp ? 'Home' : 'Settings'}
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 220,
                contentStyle: { backgroundColor: palette.bg },
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen
                name="Compose"
                component={ComposeScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 260 }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ animation: 'slide_from_right', animationDuration: 220 }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </Animated.View>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
});