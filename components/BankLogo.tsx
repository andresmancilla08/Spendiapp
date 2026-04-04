import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLOMBIAN_BANKS } from '../config/banks';

interface BankLogoProps {
  bankId: string;
  size?: number;
  radius?: number;
}

export default function BankLogo({ bankId, size = 40, radius = 10 }: BankLogoProps) {
  const bank = COLOMBIAN_BANKS.find((b) => b.id === bankId);
  const [logoFailed, setLogoFailed] = useState(false);

  const showLogo = !!bank?.logoUrl && !logoFailed;

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: showLogo ? '#F5F5F5' : (bank?.color ?? '#888888'),
      },
    ]}>
      {showLogo ? (
        <Image
          source={{ uri: bank!.logoUrl! }}
          style={{ width: size * 0.75, height: size * 0.75 }}
          resizeMode="contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.3 }]}>
          {bank?.initials ?? '??'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#FFFFFF', fontWeight: '800' },
});
