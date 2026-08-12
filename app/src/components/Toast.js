import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, fonts, radii, shadows } from '../theme';

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const show = useCallback(
    (opts) => {
      const type = (opts && opts.type) || 'info';
      const message = typeof opts === 'string' ? opts : opts.message;
      setToast({ type, message });
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setToast(null);
          anim.setValue(0);
        });
      }, 2600);
    },
    [anim]
  );

  const config = {
    success: { color: palette.success, icon: 'check-circle' },
    error: { color: palette.error, icon: 'warning' },
    info: { color: palette.info, icon: 'info' },
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Modal
        visible={!!toast}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.overlay} pointerEvents="box-none">
          {toast ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.wrap,
                { top: insets.top + 12, opacity: anim },
                { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] },
              ]}
            >
              <View style={styles.card}>
                <MaterialIcons name={config[toast.type].icon} size={20} color={config[toast.type].color} />
                <Text style={styles.message}>{toast.message}</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: '100%',
    ...shadows.card,
  },
  message: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    color: palette.ink,
    fontFamily: fonts.semibold,
  },
});
