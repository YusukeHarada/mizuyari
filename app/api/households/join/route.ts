import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminFirestore } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inviteCode, migrateExisting } = await request.json().catch(() => ({})) as {
    inviteCode?: string;
    migrateExisting?: boolean;
  };
  if (!inviteCode) return NextResponse.json({ error: 'inviteCode が必要です' }, { status: 400 });

  const db = adminFirestore();

  const snap = await db.collection('households').where('inviteCode', '==', inviteCode.toUpperCase()).limit(1).get();
  if (snap.empty) return NextResponse.json({ error: '招待コードが見つかりません' }, { status: 404 });

  const householdDoc = snap.docs[0];
  const householdId = householdDoc.id;

  await householdDoc.ref.update({ memberUids: FieldValue.arrayUnion(uid) });

  if (migrateExisting) {
    const batch = db.batch();
    const plants = await db.collection('plants').where('userId', '==', uid).get();
    plants.docs.forEach(d => batch.update(d.ref, { householdId }));
    const logs = await db.collection('watering_logs').where('userId', '==', uid).get();
    logs.docs.forEach(d => batch.update(d.ref, { householdId }));
    await batch.commit();
  }

  return NextResponse.json({ householdId });
}
