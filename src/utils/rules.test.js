const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCategory } = require('./category');
const { isHttpUrl, isS3Url, isRelativeMediaPath, isAllowedMediaUrl, normalizeS3Url, normalizeMediaUrl } = require('./media');

test('normalizeCategory matches known categories case-insensitively and falls back to Other', () => {
  assert.equal(normalizeCategory('hindi'), 'Hindi');
  assert.equal(normalizeCategory('Bangla'), 'Bangla');
  assert.equal(normalizeCategory('nasheed'), 'Nasheed');
  assert.equal(normalizeCategory('sura'), 'Sura');
  assert.equal(normalizeCategory('ENGLISH'), 'English');
  assert.equal(normalizeCategory('UnknownGenre'), 'Other');
  assert.equal(normalizeCategory(''), 'Other');
  assert.equal(normalizeCategory(null), 'Other');
});

test('media URL validation accurately classifies protocols and paths', () => {
  assert.equal(isHttpUrl('https://example.com/song.mp3'), true);
  assert.equal(isHttpUrl('http://example.com/cover.jpg'), true);
  assert.equal(isHttpUrl('ftp://example.com/file'), false);
  assert.equal(isHttpUrl('not-a-url'), false);

  assert.equal(isS3Url('s3://mybucket/audio/song.mp3'), true);
  assert.equal(isS3Url('https://mybucket.s3.amazonaws.com/song.mp3'), false);

  assert.equal(isRelativeMediaPath('/uploads/audio/track.mp3'), true);
  assert.equal(isRelativeMediaPath('//malicious.com'), false);
  assert.equal(isRelativeMediaPath('relative/without/slash'), false);

  assert.equal(isAllowedMediaUrl('https://example.com/audio.mp3'), true);
  assert.equal(isAllowedMediaUrl('s3://mybucket/file.mp3'), true);
  assert.equal(isAllowedMediaUrl('/uploads/audio/file.mp3'), true);
  assert.equal(isAllowedMediaUrl('javascript:alert(1)'), false);
});

test('normalizeS3Url converts s3:// URI into valid HTTPS URL with encoded segments', () => {
  const s3Uri = 's3://my-music-bucket/audio/My Song #1.mp3';
  const converted = normalizeS3Url(s3Uri);
  assert.ok(converted.startsWith('https://my-music-bucket.s3.'));
  assert.ok(converted.includes('My%20Song%20%231.mp3'));
});
