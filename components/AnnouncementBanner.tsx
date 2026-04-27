import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useAnnouncement } from '../hooks/useAnnouncement';

const TYPE_CONFIG = {
  info:    { icon: 'information-circle-outline' as const, color: '#00ACC1' },
  warning: { icon: 'warning-outline' as const,            color: '#F59E0B' },
  promo:   { icon: 'star-outline' as const,               color: '#8B5CF6' },
};

export default function AnnouncementBanner() {
  const announcement = useAnnouncement();
  const { colors } = useTheme();

  if (!announcement) return null;

  const config = TYPE_CONFIG[announcement.type];

  return (
    <View style={[styles.banner, { backgroundColor: `${config.color}18`, borderColor: `${config.color}40` }]}>
      <Ionicons name={config.icon} size={18} color={config.color} />
      <Text style={[styles.msg, { color: colors.textPrimary, flex: 1 }]}>{announcement.message}</Text>
      {announcement.cta && (
        <TouchableOpacity onPress={() => Linking.openURL(announcement.cta!)} activeOpacity={0.8}>
          <Text style={[styles.cta, { color: config.color }]}>Ver →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginTop: 8 },
  msg: { fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
  cta: { fontSize: 13, fontFamily: Fonts.bold },
});
