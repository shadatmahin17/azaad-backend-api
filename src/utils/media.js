function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

function isS3Url(value) {
  if (!value || typeof value !== 'string') return false;
  return /^s3:\/\/[^/]+\/.+/i.test(value.trim());
}

function isAllowedMediaUrl(value) {
  return isHttpUrl(value) || isS3Url(value);
}

function normalizeS3Url(value) {
  if (!isS3Url(value)) return value;
  const trimmed = value.trim();
  const withoutProtocol = trimmed.slice(5);
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex === -1) return value;

  const bucket = withoutProtocol.slice(0, slashIndex).trim();
  const key = withoutProtocol.slice(slashIndex + 1).trim();
  if (!bucket || !key) return value;

  const region = (process.env.AWS_REGION || process.env.S3_REGION || '').trim();
  const encodedKey = encodeURI(key);
  if (region) {
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }
  return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
}

function normalizeMediaUrl(value) {
  if (!value || typeof value !== 'string') return value;
  if (isS3Url(value)) return normalizeS3Url(value);
  return value.trim();
}

module.exports = {
  isHttpUrl,
  isS3Url,
  isAllowedMediaUrl,
  normalizeS3Url,
  normalizeMediaUrl,
};
