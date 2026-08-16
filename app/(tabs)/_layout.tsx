import { Tabs } from 'expo-router';
import AppTabBar from '../../components/AppTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Solo las tres pantallas que la barra muestra. Budget, Profile y Settings
          se abren desde otra pantalla y necesitan volver a ella: dentro del Tab
          navigator, `router.back()` caía siempre al primer tab (Home). Viven en
          `app/` como pantallas del Stack. */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="tools" />
    </Tabs>
  );
}
