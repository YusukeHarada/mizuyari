'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { getHousehold } from '@/lib/household';
import { Household } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user?.email) setEmail(user.email);
      if (user) {
        const hh = await getHousehold(user.uid);
        setHousehold(hh);
      } else {
        setHousehold(null);
      }
    });
  }, []);

  async function handleSignOut() {
    setLoading(true);
    await fetch('/api/session', { method: 'DELETE' });
    await auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function handleCopyCode() {
    if (!household?.inviteCode) return;
    navigator.clipboard.writeText(household.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">設定</h1>

      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">アカウント</p>
          <p className="text-gray-700 font-medium">{email || '読み込み中...'}</p>
        </div>

        {household !== undefined && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">家族グループ</p>
            {household ? (
              <>
                <p className="text-sm text-gray-600 mb-3">招待コードを共有して家族を追加できます</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold tracking-[0.2em] text-green-600 flex-1">
                    {household.inviteCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-sm text-green-600 font-medium border border-green-200 rounded-lg px-3 py-1.5 active:bg-green-50 transition-colors"
                  >
                    {copied ? 'コピー済' : 'コピー'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  メンバー: {household.memberUids.length}人
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">グループ未設定</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">天気・位置情報</p>
          <p className="text-sm text-gray-600">
            水やり間隔の計算に現在地の天気を使用しています。ブラウザの位置情報を許可することで、
            気温や降水量に基づいた正確な水やりタイミングを提案します。
          </p>
          <p className="text-xs text-gray-400 mt-2">位置情報は天気APIにのみ使用され、サーバーには保存されません。</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">間隔の計算について</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>・<span className="font-medium">夏（6〜9月）</span>: 間隔を短縮（×0.7）</p>
            <p>・<span className="font-medium">冬（12〜2月）</span>: 間隔を延長（×1.4）</p>
            <p>・<span className="font-medium">高温（35°C〜）</span>: 間隔を短縮（×0.6）</p>
            <p>・<span className="font-medium">降雨20mm以上</span>: +2日追加</p>
            <p>・<span className="font-medium">小さい鉢</span>: 間隔を短縮（×0.8）</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full py-4 bg-white rounded-2xl text-red-500 font-semibold shadow-sm disabled:opacity-60 active:scale-95 transition-transform"
        >
          {loading ? 'ログアウト中...' : 'ログアウト'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">みずやり v0.1.0</p>
    </div>
  );
}
