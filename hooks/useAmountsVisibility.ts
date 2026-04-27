import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'spendia_amounts_hidden';

export function useAmountsVisibility() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === '1') setHidden(true); })
      .catch(() => {});
  }, []);

  const toggle = () => {
    setHidden((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  };

  return { hidden, toggle };
}
