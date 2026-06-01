import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebase/admin';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) redirect('/login');

  try {
    await adminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col">
      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-50">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          <Link href="/" className="flex flex-col items-center gap-0.5 text-green-600 min-w-[60px] py-2">
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-medium">ホーム</span>
          </Link>
          <Link href="/plants/new" className="flex flex-col items-center gap-0.5 min-w-[60px] py-2">
            <span className="text-2xl bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl -mt-6 shadow-lg">＋</span>
            <span className="text-xs font-medium text-gray-500 mt-1">追加</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-0.5 text-gray-400 min-w-[60px] py-2">
            <span className="text-2xl">⚙️</span>
            <span className="text-xs font-medium">設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
