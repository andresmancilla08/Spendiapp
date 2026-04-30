import { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import type { AuthMethod } from '../hooks/useConsentLogger';

interface Props {
  visible: boolean;
  method: AuthMethod;
  onAccept: () => void;
  onCancel: () => void;
}

export default function ConsentModal({ visible, method, onAccept, onCancel }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(340)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 280,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 340, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const methodIcon = method === 'google' ? 'logo-google' : 'mail-outline';
  const methodLabel = t(`login.${method === 'google' ? 'googleButton' : 'emailButton'}`);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.root} pointerEvents="box-none">
        {/* Overlay */}
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onCancel} activeOpacity={1} />
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.cardWrapper,
            { transform: [{ translateY: cardTranslateY }] },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.card, { backgroundColor: colors.surfaceElevated }]}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '1A' }]}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('consentModal.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('consentModal.subtitle')}
            </Text>

            {/* Docs list */}
            <View style={[styles.docsContainer, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.docRow, { borderBottomColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => router.push('/terms' as any)}
              >
                <View style={[styles.docIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.docLabel, { color: colors.textPrimary }]}>
                  {t('consentModal.terms')}
                </Text>
                <View style={styles.docRight}>
                  <Text style={[styles.docRead, { color: colors.primary }]}>
                    {t('consentModal.read')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docRow}
                activeOpacity={0.7}
                onPress={() => router.push('/privacy' as any)}
              >
                <View style={[styles.docIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.docLabel, { color: colors.textPrimary }]}>
                  {t('consentModal.privacy')}
                </Text>
                <View style={styles.docRight}>
                  <Text style={[styles.docRead, { color: colors.primary }]}>
                    {t('consentModal.read')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Accept button */}
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <Ionicons name={methodIcon} size={17} color={colors.onPrimary} />
              <Text style={[styles.acceptBtnText, { color: colors.onPrimary }]}>
                {t('consentModal.accept')}
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
                {t('consentModal.cancel')}
              </Text>
            </TouchableOpacity>

            {/* Legal note */}
            <Text style={[styles.legalNote, { color: colors.textTertiary }]}>
              {t('consentModal.legalNote')}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 300,
  },
  docsContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  docIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLabel: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  docRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  docRead: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  acceptBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  acceptBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
  },
  cancelBtn: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  cancelText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  legalNote: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 320,
  },
});
