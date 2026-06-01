'use client';

import { useState } from 'react';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

interface Props {
  plantId: string;
  onWatered: (plantId: string) => void;
  large?: boolean;
}

export default function WateringButton({ plantId, onWatered, large = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleWater(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || done) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    try {
      const now = Timestamp.now();
      // 水やりログを追加 + plant の lastWateredAt を同時更新（インデックス不要にするデノーマライズ）
      await Promise.all([
        addDoc(collection(db, 'watering_logs'), { plantId, userId: uid, wateredAt: now }),
        updateDoc(doc(db, 'plants', plantId), { lastWateredAt: now }),
      ]);
      setDone(true);
      onWatered(plantId);
      setTimeout(() => setDone(false), 1000);
    } finally {
      setLoading(false);
    }
  }

  if (large) {
    return (
      <button
        onClick={handleWater}
        disabled={loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
          done ? 'bg-green-100 text-green-600' : 'bg-green-500 text-white shadow-md'
        } disabled:opacity-60`}
      >
        {done ? '✓ 記録しました' : loading ? '記録中...' : '💧 水をあげた'}
      </button>
    );
  }

  return (
    <button
      onClick={handleWater}
      disabled={loading}
      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 shrink-0 ${
        done ? 'bg-green-100' : 'bg-green-500 shadow-sm'
      } disabled:opacity-60`}
    >
      {done ? '✓' : loading ? '…' : '💧'}
    </button>
  );
}
