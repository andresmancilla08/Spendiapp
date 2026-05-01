import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
