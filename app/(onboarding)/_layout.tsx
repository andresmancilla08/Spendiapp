import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
