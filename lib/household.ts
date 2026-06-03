import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Household } from '@/types';

export async function getHousehold(uid: string): Promise<Household | null> {
  const snap = await getDocs(
    query(collection(db, 'households'), where('memberUids', 'array-contains', uid), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Household;
}
