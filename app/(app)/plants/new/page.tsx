'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { PLANT_TYPES } from '@/lib/plant-types';
import { PlantSize } from '@/types';

const SIZES: { value: PlantSize; label: string; desc: string; emoji: string }[] = [
  { value: 'small',  label: '小', desc: '鉢小さめ・卓上サイズ', emoji: '🌱' },
  { value: 'medium', label: '中', desc: '一般的な鉢サイズ',     emoji: '🪴' },
  { value: 'large',  label: '大', desc: '大型鉢・地植え',       emoji: '🌳' },
];

export default function NewPlantPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('foliage');
  const [size, setSize] = useState<PlantSize>('medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('植物の名前を入力してください'); return; }

    const uid = auth.currentUser?.uid;
    if (!uid) { setError('ログインが必要です'); return; }

    setSaving(true);
    setError('');

    await addDoc(collection(db, 'plants'), {
      userId: uid,
      name: name.trim(),
      type_id: typeId,
      size,
      image_url: null,
      createdAt: Timestamp.now(),
    });

    router.push('/');
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <Link href="/" className="text-green-600 text-sm font-medium mb-4 inline-flex items-center gap-1">
        ← ホームへ
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-6">植物を追加</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-60 active:scale-95 transition-transform shadow-md">
          {saving ? '登録中...' : '植物を登録する 🌱'}
        </button>
      </form>
    </div>
  );
}
