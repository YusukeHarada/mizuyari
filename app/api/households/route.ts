import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminFirestore } from '@/lib/firebase/admin';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字（0/O, 1/I/L）を除外
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

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

  const { migrateExisting } = await request.json().catch(() => ({})) as { migrateExisting?: boolean };

  const db = adminFirestore();

  const existing = await db.collection('households').where('memberUids', 'array-contains', uid).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ error: 'すでにグループに参加しています' }, { status: 409 });
  }

  let inviteCode = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateInviteCode();
    const check = await db.collection('households').where('inviteCode', '==', candidate).limit(1).get();
    if (check.empty) { inviteCode = candidate; break; }
  }
  if (!inviteCode) return NextResponse.json({ error: 'コード生成に失敗しました' }, { status: 500 });

  const householdRef = await db.collection('households').add({
    ownerUid: uid,
    memberUids: [uid],
    inviteCode,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (migrateExisting) {
    const batch = db.batch();
    const plants = await db.collection('plants').where('userId', '==', uid).get();
    plants.docs.forEach(d => batch.update(d.ref, { householdId: householdRef.id }));
    const logs = await db.collection('watering_logs').where('userId', '==', uid).get();
    logs.docs.forEach(d => batch.update(d.ref, { householdId: householdRef.id }));
    await batch.commit();
  }

  return NextResponse.json({ householdId: householdRef.id, inviteCode });
}
