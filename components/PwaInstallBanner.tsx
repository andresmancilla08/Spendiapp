import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import AppDialog from './AppDialog';
import { Fonts } from '../config/fonts';

export default function PwaInstallBanner() {
  const { isStandalone, canNativeInstall, install } = usePwaInstall();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [dialogVisible, setDialogVisible] = useState(false);

  if (isStandalone) return null;

  const handlePress = async () => {
    if (canNativeInstall) {
      await install();
    } else {
      setDialogVisible(true);
    }
  };

  return (
    <>
      <AppDialog
        visible={dialogVisible}
        type="info"
        title={t('pwaInstall.dialogTitle')}
        description={
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' }}>
            {'1. Toca el ícono de '}<Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{'compartir ↑'}</Text>{'\n'}
            {'2. Selecciona '}<Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{'"Añadir a pantalla de inicio"'}</Text>{'\n'}
            {'3. Toca '}<Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{'"Añadir"'}</Text>{' para confirmar'}
          </Text>
        }
        primaryLabel={t('pwaInstall.dialogButton')}
        onPrimary={() => setDialogVisible(false)}
      />

      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: colors.tertiaryLight,
            borderLeftColor: colors.tertiary,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="download-outline" size={24} color={colors.tertiaryDark} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('pwaInstall.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('pwaInstall.subtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.tertiaryDark} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  textBlock: { flex: 1 },
  title: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 2 },
  subtitle: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
});
