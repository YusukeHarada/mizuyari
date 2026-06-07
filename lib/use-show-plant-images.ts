'use client';

import { useEffect, useState } from 'react';

const KEY = 'showPlantImages';

export function useShowPlantImages(): [boolean, (v: boolean) => void] {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) setShow(stored === 'true');
  }, []);

  function update(v: boolean) {
    setShow(v);
    localStorage.setItem(KEY, String(v));
  }

  return [show, update];
}
