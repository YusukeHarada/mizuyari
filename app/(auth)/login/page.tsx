'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

const provider = new GoogleAuthProvider();

async function createSession(user: { getIdToken: () => Promise<string> }) {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error('セッション作成失敗');
}

function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // リダイレクト結果を処理しつつ、auth状態の変化も監視する
    let redirectHandled = false;

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return;
        redirectHandled = true;
        await createSession(result.user);
        router.push('/');
        router.refresh();
      })
      .catch((err) => {
        console.error('redirect result error:', err);
        setError('Googleログインに失敗しました');
        setLoading(false);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (redirectHandled) return;

      // getRedirectResultが null を返した場合のフォールバック
      try {
        await createSession(user);
        router.push('/');
        router.refresh();
      } catch {
        setError('Googleログインに失敗しました');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);

    if (isAndroid()) {
      // Android Chrome では signInWithPopup が disallowed_useragent でブロックされるため redirect を使う
      await signInWithRedirect(auth, provider);
      return;
    }

    try {
      const { user } = await signInWithPopup(auth, provider);
      await createSession(user);
      router.push('/');
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      setError('Googleログインに失敗しました');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-green-600 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🪴</div>
          <h1 className="text-2xl font-bold text-green-800">みずやり</h1>
          <p className="text-green-600 text-sm mt-1">植物の水やり管理アプリ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 py-3 rounded-xl font-semibold text-gray-700 active:scale-95 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6.1C12.5 13 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
              <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.5 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.1-6z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-8.1 6C6.7 42.6 14.7 48 24 48z"/>
            </svg>
            Googleでログイン
          </button>
        </div>
      </div>
    </div>
  );
}
