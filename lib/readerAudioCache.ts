export interface ReaderAudioCacheOptions {
  quality?: string;
  language?: string;
  voice?: string;
  speed?: number;
  rate?: number;
  pipelineTags?: Record<string, unknown>;
}

export function createReaderAudioCacheIdentity(text: string, options: ReaderAudioCacheOptions = {}) {
  const signature = JSON.stringify([
    text.trim(),
    options.quality ?? 'standard',
    options.language ?? '',
    options.voice ?? '',
    options.speed ?? '',
    options.rate ?? '',
    options.pipelineTags ?? {},
  ]);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < signature.length; index += 1) {
    const code = signature.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return {
    key: `reader-tts-${first.toString(16)}${second.toString(16)}`,
    signature,
  };
}
