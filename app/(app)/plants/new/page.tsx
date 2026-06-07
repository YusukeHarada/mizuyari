'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { getHousehold } from '@/lib/household';
import { PLANT_TYPES } from '@/lib/plant-types';
import { PlantSize, PlantLocation } from '@/types';

const SIZES: { value: PlantSize; label: string; desc: string; emoji: string }[] = [
  { value: 'small',  label: '小', desc: '鉢小さめ・卓上サイズ', emoji: '🌱' },
  { value: 'medium', label: '中', desc: '一般的な鉢サイズ',     emoji: '🪴' },
  { value: 'large',  label: '大', desc: '大型鉢・地植え',       emoji: '🌳' },
];

export default function NewPlantPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('foliage');
  const [size, setSize] = useState<PlantSize>('medium');
  const [location, setLocation] = useState<PlantLocation>('indoor');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const hh = await getHousehold(u.uid);
      setHouseholdId(hh?.id ?? null);
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('画像は10MB以下にしてください');
      return;
    }
    setError('');
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('植物の名前を入力してください'); return; }

    const uid = auth.currentUser?.uid;
    if (!uid) { setError('ログインが必要です'); return; }

    setSaving(true);
    setError('');

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const form = new FormData();
        form.append('file', imageFile);
        const res = await fetch('/api/upload-image', { method: 'POST', body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? '画像のアップロードに失敗しました');
        }
        const data = await res.json();
        imageUrl = data.url;
      }

      await addDoc(collection(db, 'plants'), {
        userId: uid,
        householdId: householdId ?? undefined,
        name: name.trim(),
        type_id: typeId,
        size,
        location,
        image_url: imageUrl,
        createdAt: Timestamp.now(),
      });

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <Link href="/" className="text-green-600 text-sm font-medium mb-4 inline-flex items-center gap-1">
        ← ホームへ
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-6">植物を追加</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 写真 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">写真（任意）</label>
          {previewUrl ? (
            <div className="relative w-28 h-28">
              <Image
                src={previewUrl}
                alt="プレビュー"
                fill
                className="rounded-xl object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
            >
              <span className="text-3xl">📷</span>
              <span className="text-xs mt-1">タップして選択</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/heic,image/heif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">名前</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="例: ベランダのパキラ"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">種類</label>
          <div className="grid grid-cols-3 gap-2">
            {PLANT_TYPES.map(type => (
              <button key={type.id} type="button" onClick={() => setTypeId(type.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  typeId === type.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                }`}>
                <div className="text-2xl mb-1">{type.emoji}</div>
                <div className="text-xs font-medium text-gray-700 leading-tight">{type.name_ja}</div>
                <div className="text-xs text-gray-400 mt-0.5">{type.base_interval_days}日毎</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">サイズ</label>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map(s => (
              <button key={s.value} type="button" onClick={() => setSize(s.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  size === s.value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                }`}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-sm font-bold text-gray-700">{s.label}</div>
                <div className="text-xs text-gray-400 leading-tight mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">置き場所</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'indoor' as PlantLocation, label: '屋内', desc: '室内・ベランダ内側', emoji: '🏠' },
              { value: 'outdoor' as PlantLocation, label: '屋外', desc: '庭・ベランダ外側', emoji: '☀️' },
            ]).map(opt => (
              <button key={opt.value} type="button" onClick={() => setLocation(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  location === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                }`}>
                <div className="text-2xl mb-1">{opt.emoji}</div>
                <div className="text-sm font-bold text-gray-700">{opt.label}</div>
                <div className="text-xs text-gray-400 leading-tight mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
          {location === 'outdoor' && (
            <p className="text-xs text-gray-400 mt-2">
              屋外では雨や気温による水やり調整が強めに働きます
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-60 active:scale-95 transition-transform shadow-md">
          {saving ? (imageFile ? 'アップロード中...' : '登録中...') : '植物を登録する 🌱'}
        </button>
      </form>
    </div>
  );
}
