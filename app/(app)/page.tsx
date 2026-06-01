'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { Plant, WeatherData, WateringSchedule } from '@/types';
import { calculateWateringSchedule } from '@/lib/watering-calculator';
import { getPlantType } from '@/lib/plant-types';
import PlantCard from '@/components/PlantCard';

interface PlantWithSchedule { plant: Plant; schedule: WateringSchedule; }
const URGENCY_ORDER = { overdue: 0, today: 1, soon: 2, ok: 3 };

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'object' && 'toDate' in (val as object)) return (val as { toDate(): Date }).toDate();
  return new Date(val as string);
}

export default function HomePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUid(u?.uid ?? null));
  }, []);

  const fetchPlants = useCallback(async (userId: string) => {
    // orderBy なし → クライアントソートでインデックス不要
    const snap = await getDocs(
      query(collection(db, 'plants'), where('userId', '==', userId))
    );
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as Plant)
      .sort((a, b) => {
        const ta = toDate(a.createdAt)?.getTime() ?? 0;
        const tb = toDate(b.createdAt)?.getTime() ?? 0;
        return ta - tb;
      });
    setPlants(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (uid) fetchPlants(uid);
  }, [uid, fetchPlants]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/weather?lat=${coords.latitude}&lon=${coords.longitude}`);
          if (res.ok) setWeather(await res.json());
        } catch { /* サイレントに無視 */ }
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  function handleWatered(plantId: string) {
    setPlants(prev => prev.map(p =>
      p.id === plantId ? { ...p, lastWateredAt: new Date().toISOString() } : p
    ));
  }

  const plantsWithSchedule: PlantWithSchedule[] = plants.map(plant => ({
    plant,
    schedule: calculateWateringSchedule(
      toDate(plant.lastWateredAt),
      getPlantType(plant.type_id),
      plant.size,
      weather
    ),
  })).sort((a, b) => URGENCY_ORDER[a.schedule.urgency] - URGENCY_ORDER[b.schedule.urgency]);

  const overdueCount = plantsWithSchedule.filter(
    p => p.schedule.urgency === 'overdue' || p.schedule.urgency === 'today'
  ).length;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🪴 みずやり</h1>
          {overdueCount > 0 && (
            <p className="text-sm text-amber-600 font-medium">
              {overdueCount}つの植物が水やりを必要としています
            </p>
          )}
        </div>
        {weather && (
          <div className="bg-white rounded-xl px-3 py-2 shadow-sm text-center min-w-[70px]">
            <p className="text-lg font-bold text-gray-800">{Math.round(weather.temperature)}°C</p>
            <p className="text-xs text-gray-500">{weather.weather_description}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : plants.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-gray-500 mb-2">まだ植物が登録されていません</p>
          <Link href="/plants/new" className="inline-block mt-4 bg-green-500 text-white px-6 py-3 rounded-xl font-medium">
            最初の植物を追加する
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plantsWithSchedule.map(({ plant, schedule }) => (
            <PlantCard key={plant.id} plant={plant} schedule={schedule} onWatered={handleWatered} />
          ))}
        </div>
      )}
    </div>
  );
}
