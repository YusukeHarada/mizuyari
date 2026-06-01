'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  doc, getDoc, collection, query, where, getDocs, deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { Plant, WateringLog, WeatherData } from '@/types';
import { calculateWateringSchedule } from '@/lib/watering-calculator';
import { getPlantType } from '@/lib/plant-types';
import WateringButton from '@/components/WateringButton';
import WateringScheduleInfo from '@/components/WateringSchedule';

const SIZE_LABELS: Record<string, string> = { small: '小', medium: '中', large: '大' };

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'object' && 'toDate' in (val as object)) return (val as { toDate(): Date }).toDate();
  return new Date(val as string);
}

export default function PlantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<WateringLog[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData(userId: string) {
    try {
      const plantSnap = await getDoc(doc(db, 'plants', params.id));
      if (plantSnap.exists()) {
        setPlant({ id: plantSnap.id, ...plantSnap.data() } as Plant);
      }

      // userId を条件に追加してルールに適合させる（orderBy なし → クライアントソート）
      const logsSnap = await getDocs(
        query(
          collection(db, 'watering_logs'),
          where('plantId', '==', params.id),
          where('userId', '==', userId),
        )
      );
      const logList = logsSnap.docs
        .map(d => {
          const data = d.data();
          const ts = toDate(data.wateredAt);
          return {
            id: d.id,
            plantId: data.plantId,
            wateredAt: ts ? ts.toISOString() : '',
          } as WateringLog;
        })
        .filter(l => l.wateredAt)
        .sort((a, b) => new Date(b.wateredAt).getTime() - new Date(a.wateredAt).getTime())
        .slice(0, 20);
      setLogs(logList);
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        fetchData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [params.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/weather?lat=${coords.latitude}&lon=${coords.longitude}`);
          if (res.ok) setWeather(await res.json());
        } catch { /* 無視 */ }
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  async function handleDelete() {
    if (!confirm(`「${plant?.name}」を削除しますか？水やり記録もすべて削除されます。`)) return;
    if (!uid) return;
    try {
      const logsSnap = await getDocs(
        query(
          collection(db, 'watering_logs'),
          where('plantId', '==', params.id),
          where('userId', '==', uid),
        )
      );
      await Promise.all(logsSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'plants', params.id));
      router.push('/');
    } catch (err) {
      console.error('handleDelete error:', err);
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="h-48 bg-white rounded-2xl animate-pulse mb-4" />
        <div className="h-32 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-20 text-center">
        <p className="text-gray-500">植物が見つかりませんでした</p>
        <Link href="/" className="text-green-600 mt-4 block">ホームへ戻る</Link>
      </div>
    );
  }

  const plantType = getPlantType(plant.type_id);
  const lastWatered = toDate(plant.lastWateredAt) ?? (logs.length > 0 ? new Date(logs[0].wateredAt) : null);
  const schedule = calculateWateringSchedule(lastWatered, plantType, plant.size, weather);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <Link href="/" className="text-green-600 text-sm font-medium mb-4 inline-flex items-center gap-1">
        ← ホームへ
      </Link>

      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl bg-green-100 flex items-center justify-center text-5xl flex-shrink-0 overflow-hidden relative">
            {plant.image_url ? (
              <Image src={plant.image_url} alt={plant.name} fill className="object-cover" unoptimized />
            ) : (
              plantType.emoji
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{plant.name}</h1>
            <p className="text-gray-500 text-sm">{plantType.name_ja}</p>
            <p className="text-gray-400 text-sm">サイズ: {SIZE_LABELS[plant.size]}</p>
            {lastWatered && (
              <p className="text-gray-400 text-sm">
                最終水やり: {lastWatered.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <WateringScheduleInfo schedule={schedule} />
      </div>

      <div className="mb-6">
        <WateringButton
          plantId={plant.id}
          onWatered={() => uid && fetchData(uid)}
          large
        />
      </div>

      {logs.length > 0 && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">水やり履歴</h2>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={log.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                <span className="text-blue-400">💧</span>
                <span className="text-gray-700 text-sm">
                  {new Date(log.wateredAt).toLocaleDateString('ja-JP', {
                    year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
                  })}
                </span>
                {i === 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">最新</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleDelete}
        className="w-full py-3 rounded-xl text-red-500 text-sm font-medium border border-red-200 active:bg-red-50">
        この植物を削除する
      </button>
    </div>
  );
}
