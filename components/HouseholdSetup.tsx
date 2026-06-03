'use client';

import { useState } from 'react';

interface Props {
  onDone: (householdId: string, inviteCode?: string) => void;
}

type Mode = 'choose' | 'create' | 'join';

export default function HouseholdSetup({ onDone }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [migrate, setMigrate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ householdId: string; inviteCode: string } | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrateExisting: migrate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'グループの作成に失敗しました');
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'グループの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { setError('招待コードを入力してください'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/households/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), migrateExisting: migrate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'グループへの参加に失敗しました');
      onDone(data.householdId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'グループへの参加に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-4 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">グループを作成しました</h2>
        <p className="text-gray-500 mb-8">家族に以下の招待コードを共有してください</p>
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">招待コード</p>
          <p className="text-4xl font-bold tracking-[0.3em] text-green-600">{created.inviteCode}</p>
        </div>
        <button
          onClick={() => onDone(created.householdId, created.inviteCode)}
          className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-md active:scale-95 transition-transform"
        >
          ホームへ
        </button>
      </div>
    );
  }

  if (mode === 'choose') {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-4">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">👨‍👩‍👧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">家族グループを設定</h2>
          <p className="text-gray-500 text-sm">植物の管理を家族みんなで共有できます</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => setMode('create')}
            className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg shadow-md active:scale-95 transition-transform"
          >
            新しいグループを作る
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full bg-white text-green-600 py-4 rounded-2xl font-bold text-lg border-2 border-green-200 active:scale-95 transition-transform"
          >
            招待コードで参加する
          </button>
        </div>
      </div>
    );
  }

  const MigrateCheckbox = () => (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={migrate}
          onChange={e => setMigrate(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-green-500 rounded"
        />
        <div>
          <p className="font-medium text-gray-800">既存の植物をグループに移行する</p>
          <p className="text-sm text-gray-500 mt-0.5">今まで登録した植物をグループで共有します</p>
        </div>
      </label>
    </div>
  );

  if (mode === 'create') {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-4">
        <button onClick={() => setMode('choose')} className="text-green-600 text-sm font-medium mb-4 inline-flex items-center gap-1">
          ← 戻る
        </button>
        <h2 className="text-xl font-bold text-gray-800 mb-6">グループを作る</h2>
        <div className="space-y-4">
          <MigrateCheckbox />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-60 shadow-md active:scale-95 transition-transform"
          >
            {loading ? '作成中...' : 'グループを作成する'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <button onClick={() => setMode('choose')} className="text-green-600 text-sm font-medium mb-4 inline-flex items-center gap-1">
        ← 戻る
      </button>
      <h2 className="text-xl font-bold text-gray-800 mb-6">招待コードで参加</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">招待コード（6文字）</label>
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 text-center text-2xl font-bold tracking-widest uppercase"
          />
        </div>
        <MigrateCheckbox />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-60 shadow-md active:scale-95 transition-transform"
        >
          {loading ? '参加中...' : '参加する'}
        </button>
      </div>
    </div>
  );
}
