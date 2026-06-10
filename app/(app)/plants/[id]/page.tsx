'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { Plant, WateringLog, PlantLocation } from '@/types';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [logs, setLogs] = useState<WateringLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);

  async function fetchData(userId: string) {
    try {
      const plantSnap = await getDoc(doc(db, 'plants', params.id));
      if (!plantSnap.exists()) return;
      const plantData = { id: plantSnap.id, ...plantSnap.data() } as Plant;
      setPlant(plantData);

      // householdId があればグループ全員のログを取得、なければ自分のログのみ
      const logsQuery = plantData.householdId
        ? query(collection(db, 'watering_logs'), where('plantId', '==', params.id), where('householdId', '==', plantData.householdId))
        : query(collection(db, 'watering_logs'), where('plantId', '==', params.id), where('userId', '==', userId));
      const logsSnap = await getDocs(logsQuery);
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
        .slice(0, 3);
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

  async function handleUndoWatering() {
    if (!logs[0] || !uid) return;
    const latestLog = logs[0];
    const previousLog = logs[1];
    await Promise.all([
      deleteDoc(doc(db, 'watering_logs', latestLog.id)),
      updateDoc(doc(db, 'plants', params.id), {
        lastWateredAt: previousLog ? new Date(previousLog.wateredAt) : null,
      }),
    ]);
    fetchData(uid);
  }

  async function handleDelete() {
    if (!confirm(`「${plant?.name}」を削除しますか？水やり記録もすべて削除されます。`)) return;
    if (!uid) return;
    try {
      const logsQuery = plant?.householdId
        ? query(collection(db, 'watering_logs'), where('plantId', '==', params.id), where('householdId', '==', plant.householdId))
        : query(collection(db, 'watering_logs'), where('plantId', '==', params.id), where('userId', '==', uid));
      const logsSnap = await getDocs(logsQuery);
      await Promise.all(logsSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'plants', params.id));
      router.push('/');
    } catch (err) {
      console.error('handleDelete error:', err);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !plant) return;
    if (file.size > 10 * 1024 * 1024) return;

    setImageUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (plant.image_url) form.append('oldUrl', plant.image_url);

      const res = await fetch('/api/upload-image', { method: 'POST', body: form });
      if (!res.ok) throw new Error('upload failed');
      const { url } = await res.json();

      await updateDoc(doc(db, 'plants', params.id), { image_url: url });
      setPlant(prev => prev ? { ...prev, image_url: url } : prev);
    } catch (err) {
      console.error('image update error:', err);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
  const location: PlantLocation = plant.location ?? 'indoor';
  const schedule = calculateWateringSchedule(lastWatered, plantType, plant.size, new Date(), location);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <Link href="/" className="text-green-600 text-sm font-medium mb-4 inline-flex items-center gap-1">
        ← ホームへ
      </Link>

      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="relative w-20 h-20 flex-shrink-0 group"
          >
            <div className="w-20 h-20 rounded-xl bg-green-100 flex items-center justify-center text-5xl overflow-hidden relative">
              {plant.image_url ? (
                <Image src={plant.image_url} alt={plant.name} fill className="object-cover" unoptimized />
              ) : (
                plantType.emoji
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                  <span className="text-white text-xs">更新中</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs shadow-md">
              📷
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/heic,image/heif"
            className="hidden"
            onChange={handleImageChange}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{plant.name}</h1>
            <p className="text-gray-500 text-sm">{plantType.name_ja}</p>
            <p className="text-gray-400 text-sm">サイズ: {SIZE_LABELS[plant.size]}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 text-sm">{location === 'indoor' ? '🏠 屋内' : '☀️ 屋外'}</span>
              <button
                onClick={async () => {
                  const next: PlantLocation = location === 'indoor' ? 'outdoor' : 'indoor';
                  await updateDoc(doc(db, 'plants', params.id), { location: next });
                  setPlant(prev => prev ? { ...prev, location: next } : prev);
                }}
                className="text-xs text-green-600 border border-green-200 rounded px-1.5 py-0.5"
              >
                切り替え
              </button>
            </div>
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

      {logs.length > 0 && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">直近の水やり</h2>
          <div className="flex flex-wrap gap-2">
            {logs.map((log, i) => (
              i === 0 ? (
                <span key={log.id} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-full bg-blue-100 text-blue-700">
                  <span>💧 {new Date(log.wateredAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                  <button
                    onClick={handleUndoWatering}
                    className="w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 flex items-center justify-center text-blue-600 leading-none"
                    title="取り消す"
                  >✕</button>
                </span>
              ) : (
                <span key={log.id} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                  💧 {new Date(log.wateredAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <WateringButton
          plantId={plant.id}
          householdId={plant.householdId}
          onWatered={() => uid && fetchData(uid)}
          large
        />
      </div>

      <button onClick={handleDelete}
        className="w-full py-3 rounded-xl text-red-500 text-sm font-medium border border-red-200 active:bg-red-50">
        この植物を削除する
      </button>
    </div>
  );
}
