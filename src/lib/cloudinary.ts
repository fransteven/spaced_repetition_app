import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadCardImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Image exceeds 5 MB limit');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Invalid image type');
  const b64     = Buffer.from(await file.arrayBuffer()).toString('base64');
  const dataURI = `data:${file.type};base64,${b64}`;
  const result  = await cloudinary.uploader.upload(dataURI, {
    folder: 'srs-cards',
    transformation: [{ width: 800, height: 600, crop: 'limit' }],
  });
  return result.secure_url;
}
