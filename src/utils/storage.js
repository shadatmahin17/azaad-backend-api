const fs = require('fs');
const path = require('path');
const { supabaseAdmin, hasSupabaseStorageApi } = require('../config/supabase');

/**
 * Upload a local file to a Supabase Storage bucket.
 * Returns the public URL on success, or null if Supabase storage is unavailable.
 * The local file is removed after a successful upload.
 */
async function uploadToSupabaseBucket(bucket, objectPath, localFilePath, contentType) {
  if (!hasSupabaseStorageApi) return null;

  const fileBuffer = fs.readFileSync(localFilePath);
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(objectPath, fileBuffer, { contentType, upsert: true });

  if (error) {
    console.error(`Supabase storage upload failed (${bucket}/${objectPath}):`, error.message);
    return null;
  }

  const { data: publicData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(objectPath);

  const publicUrl = publicData?.publicUrl || null;

  if (publicUrl) {
    try { fs.unlinkSync(localFilePath); } catch { /* ignore */ }
  }

  return publicUrl;
}

/**
 * Remove an object from a Supabase Storage bucket by its public URL.
 * Extracts the object path from the URL and deletes it.
 */
async function removeFromSupabaseBucket(bucket, publicUrl) {
  if (!hasSupabaseStorageApi || !publicUrl) return;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const objectPath = decodeURIComponent(publicUrl.slice(idx + marker.length));
  if (!objectPath) return;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([objectPath]);

  if (error) {
    console.error(`Supabase storage delete failed (${bucket}/${objectPath}):`, error.message);
  }
}

module.exports = { uploadToSupabaseBucket, removeFromSupabaseBucket };
