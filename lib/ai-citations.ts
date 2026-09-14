export type AiMessagePart = {
  text: string;
  isCitation: boolean;
};

const SCRIPTURE_CITATION_REGEX = /\[([^\[\]\r\n]+)\]/g;

const SCRIPTURE_CITATION_MARKERS = [
  'gita',
  'upanishad',
  'ramayana',
  'purana',
  'dhammapada',
  'sutra',
  'katha',
  'gurbani',
  'guru granth',
  'japji',
  'tattvartha',
  'saman suttam',
  'dharm veer',
  'calendar',
  'rule',
  'गीता',
  'उपनिषद',
  'रामायण',
  'पुराण',
  'धम्मपद',
  'सूत्र',
  'कथा',
  'गुरबाणी',
  'ਗੁਰਬਾਣੀ',
  'ਗੁਰੂ ਗ੍ਰੰਥ',
  'ਜਪੁਜੀ',
];

export function isScriptureCitation(citation: string): boolean {
  const normalized = citation.toLocaleLowerCase();
  return (
    SCRIPTURE_CITATION_MARKERS.some((marker) => normalized.includes(marker)) ||
    /\b\d+[.:]\d+\b/.test(normalized)
  );
}

export function parseAiMessageCitations(text: string): AiMessagePart[] {
  if (!text) return [];

  const parts: AiMessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(SCRIPTURE_CITATION_REGEX);

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), isCitation: false });
    }
    parts.push({
      text: match[0],
      isCitation: isScriptureCitation(match[1]),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isCitation: false });
  }

  return parts;
}
