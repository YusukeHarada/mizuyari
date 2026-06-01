import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { adminAuth, adminStorage } from '@/lib/firebase/admin';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const webpBuffer = await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer();

  const bucket = adminStorage().bucket();

  // 旧画像を削除（変更時）
  const oldUrl = formData.get('oldUrl') as string | null;
  if (oldUrl) {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
    const prefix = `https://storage.googleapis.com/${bucketName}/`;
    if (oldUrl.startsWith(prefix)) {
      const oldPath = decodeURIComponent(oldUrl.slice(prefix.length));
      await bucket.file(oldPath).delete().catch(() => {});
    }
  }

  const filename = `plants/${uid}/${Date.now()}.webp`;
  const fileRef = bucket.file(filename);
  await fileRef.save(webpBuffer, { contentType: 'image/webp' });
  await fileRef.makePublic();

  return NextResponse.json({ url: fileRef.publicUrl() });
}
