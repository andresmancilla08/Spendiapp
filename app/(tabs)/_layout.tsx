import { useState, useEffect, useCallback } from 'react';
import { Tabs, router } from 'expo-router';
import AppTabBar from '../../components/AppTabBar';
import ConsentModal from '../../components/ConsentModal';
import { hasAcceptedConsent, setPendingConsent, savePendingConsent } from '../../hooks/useConsentLogger';
import { useAuthStore } from '../../store/authStore';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const [consentRequired, setConsentRequired] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    hasAcceptedConsent().then((accepted) => {
      if (!accepted) setConsentRequired(true);
    });
  }, [user?.uid]);

  const handleConsentAccept = useCallback(async () => {
    setConsentRequired(false);
    setPendingConsent('google');
    if (user?.uid) await savePendingConsent(user.uid);
  }, [user?.uid]);

  return (
    <>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="budget" options={{ href: null }} />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="tools" />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
      <ConsentModal
        visible={consentRequired}
        method="google"
        onAccept={handleConsentAccept}
        onCancel={() => {}}
        required
        onTermsPress={() => router.push('/terms' as any)}
        onPrivacyPress={() => router.push('/privacy' as any)}
      />
    </>
  );
}
