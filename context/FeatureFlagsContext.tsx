import { createContext, useContext, ReactNode } from 'react';
import { useFeatureFlags, FeatureFlags, DEFAULT_FEATURE_FLAGS } from '../hooks/useFeatureFlags';

interface FeatureFlagsContextValue {
  flags: FeatureFlags;
  flagsLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: DEFAULT_FEATURE_FLAGS,
  flagsLoading: true,
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { flags, loading } = useFeatureFlags();
  return (
    <FeatureFlagsContext.Provider value={{ flags, flagsLoading: loading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFlags() {
  return useContext(FeatureFlagsContext);
}
