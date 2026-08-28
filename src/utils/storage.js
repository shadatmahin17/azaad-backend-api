const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin, hasSupabaseStorageApi } = require('../config/supabase');

/**
 * Uploads a local file to a Supabase Storage bucket asynchronously.
 * Returns the public URL on success, or null if Supabase storage is unavailable or fails.
 * The local file is removed after a successful upload.
 *
 * @param {string} bucket - Target Supabase bucket name.
 * @param {string} objectPath - Destination path/filename in the bucket.
 * @param {string} localFilePath - Path to the local file on disk.
 * @param {string} [contentType] - MIME type of the file.
 * @returns {Promise<string|null>} Public URL or null.
 */
async function uploadToSupabaseBucket(bucket, objectPath, localFilePath, contentType) {
  if (!hasSupabaseStorageApi || !supabaseAdmin?.storage) {
    return null;
  }

  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(localFilePath);
  } catch (readErr) {
    console.error(`Failed to read local file for upload (${localFilePath}):`, readErr.message);
    return null;
  }

  try {
    const uploadOptions = {
      upsert: true,
      ...(contentType ? { contentType } : {}),
    };

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, fileBuffer, uploadOptions);

    if (uploadError) {
      console.error(`Supabase storage upload failed (${bucket}/${objectPath}):`, uploadError.message);
      return null;
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(objectPath);

    const publicUrl = publicData?.publicUrl || null;

    // Clean up temporary local file upon successful upload
    if (publicUrl) {
      try {
        await fs.unlink(localFilePath);
      } catch (unlinkErr) {
        console.warn(`Could not remove temporary local file (${localFilePath}):`, unlinkErr.message);
      }
    }

    return publicUrl;
  } catch (err) {
    console.error(`Unexpected error during Supabase upload (${bucket}/${objectPath}):`, err.message);
    return null;
  }
}

/**
 * Removes an object from a Supabase Storage bucket by its public URL.
 * Extracts the object path from the URL, strips query parameters, and deletes it.
 *
 * @param {string} bucket - Target Supabase bucket name.
 * @param {string} publicUrl - Public URL of the file to delete.
 * @returns {Promise<boolean>} True if removed successfully, false otherwise.
 */
async function removeFromSupabaseBucket(bucket, publicUrl) {
  if (!hasSupabaseStorageApi || !supabaseAdmin?.storage || !publicUrl || typeof publicUrl !== 'string') {
    return false;
  }

  try {
    // Match common Supabase storage URL patterns
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
    ];

    let objectPath = '';
    for (const marker of markers) {
      const idx = publicUrl.indexOf(marker);
      if (idx !== -1) {
        const rawPath = publicUrl.slice(idx + marker.length);
        // Strip query parameters and hash fragments before decoding
        const cleanPath = rawPath.split('?')[0].split('#')[0];
        objectPath = decodeURIComponent(cleanPath);
        break;
      }
    }

    if (!objectPath) {
      return false;
    }

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([objectPath]);

    if (error) {
      console.error(`Supabase storage delete failed (${bucket}/${objectPath}):`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Unexpected error removing file from Supabase (${bucket}):`, err.message);
    return false;
  }
}

module.exports = { uploadToSupabaseBucket, removeFromSupabaseBucket };
