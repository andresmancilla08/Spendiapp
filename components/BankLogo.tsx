import { useState } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { COLOMBIAN_BANKS } from '../config/banks';

// Mapa estático requerido por Metro bundler — las entradas deben existir en disco
const LOCAL_LOGOS: Record<string, ImageSourcePropType> = {
  bancolombia: require('../assets/banks/bancolombia.png'),
  davivienda:  require('../assets/banks/davivienda.png'),
  bbva:        require('../assets/banks/bbva.png'),
  bogota:      require('../assets/banks/bogota.png'),
  colpatria:   require('../assets/banks/colpatria.png'),
  itau:        require('../assets/banks/itau.png'),
  occidente:   require('../assets/banks/occidente.png'),
  popular:     require('../assets/banks/popular.png'),
  avvillas:    require('../assets/banks/avvillas.png'),
  cajasocial:  require('../assets/banks/cajasocial.png'),
  nequi:       require('../assets/banks/nequi.png'),
  daviplata:   require('../assets/banks/daviplata.png'),
  nubank:      require('../assets/banks/nubank.png'),
  lulo:        require('../assets/banks/lulo.png'),
  rappipay:    require('../assets/banks/rappipay.png'),
  movii:       require('../assets/banks/movii.png'),
};

// Añadir el ID del banco aquí una vez que su logo REAL esté descargado en assets/banks/
// Ejecutar: node scripts/download-bank-logos.js  y luego agregar los IDs exitosos
const BANKS_WITH_REAL_LOGO = new Set<string>([
  // 'bancolombia', 'davivienda', ...
]);

interface BankLogoProps {
  bankId: string;
  size?: number;
  radius?: number;
}

export default function BankLogo({ bankId, size = 40, radius = 10 }: BankLogoProps) {
  const bank = COLOMBIAN_BANKS.find((b) => b.id === bankId);
  const localSource = BANKS_WITH_REAL_LOGO.has(bankId) ? LOCAL_LOGOS[bankId] : undefined;
  const [logoFailed, setLogoFailed] = useState(false);

  const showLogo = !!localSource && !logoFailed;

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
          source={localSource}
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
