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
    .rotate()             // EXIF方向を自動補正
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `plants/${uid}/${Date.now()}.webp`;
  const bucket = adminStorage().bucket();
  const fileRef = bucket.file(filename);

  await fileRef.save(webpBuffer, { contentType: 'image/webp' });
  await fileRef.makePublic();

  return NextResponse.json({ url: fileRef.publicUrl() });
}
