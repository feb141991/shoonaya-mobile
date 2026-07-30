export type TextScript = 'devanagari' | 'gurmukhi' | 'latin' | 'tibetan' | 'unknown';
export type TextLanguage = 'sa' | 'hi' | 'pa' | 'en' | 'unknown';

export interface PramanaPipelineTags {
  content_type?:
    | 'scripture'
    | 'commentary'
    | 'chat'
    | 'ui_text'
    | 'sacred_verse'
    | 'katha'
    | 'instruction'
    | 'stotram'
    | 'mantra'
    | 'prayer';
  response_mode?: 'deterministic' | 'conversational' | 'extractive';
  audio_mode?:
    | 'pandit'
    | 'akash'
    | 'standard'
    | 'story'
    | 'meditative'
    | 'recitation'
    | 'prerecorded'
    | 'none';
  tradition?: 'hindu' | 'buddhist' | 'jain' | 'sikh' | 'generic';
  script?: 'devanagari' | 'gurmukhi' | 'iast' | 'latin';
  delivery_intent?: 'live_user' | 'background_precompute' | 'recitation';
}

export interface ReadableContent {
  original: string;
  transliteration?: string;
  meaning?: string;

  sourceLabel?: string;
  tradition?: string;
  
  language?: TextLanguage;
  script?: TextScript;

  pipelineTags?: Partial<PramanaPipelineTags>;

  capabilities: {
    canOpenReader: boolean;
    canToggleLocalLanguage: boolean;
    canToggleTransliteration: boolean;
    canGenerateTTS: boolean;
    canShowMeaning: boolean;
    canShowExplain: boolean;
  };
}

export type ReadableCapabilities = ReadableContent['capabilities'];

function canGenerateTTS(audioMode?: string): boolean {
  return Boolean(audioMode && audioMode !== 'none' && audioMode !== 'prerecorded');
}

function canExplain(contentType?: string): boolean {
  return Boolean(contentType && [
    'sacred_verse',
    'katha',
    'scripture',
    'commentary',
    'stotram',
    'prayer',
    'mantra',
    'instruction',
  ].includes(contentType));
}

export function buildReadableCapabilities(
  content: Partial<ReadableContent>,
  overrides?: Partial<ReadableCapabilities>
): ReadableCapabilities {
  const contentType = content.pipelineTags?.content_type;
  const audioMode = content.pipelineTags?.audio_mode;
  const script = content.script ?? 'unknown';
  const ttsSource = content.original || content.transliteration;

  return {
    canOpenReader: !!content.original,
    canToggleLocalLanguage: !!content.meaning,
    canToggleTransliteration: !!content.transliteration && script !== 'latin',
    canGenerateTTS: !!ttsSource && canGenerateTTS(audioMode),
    canShowMeaning: !!content.meaning,
    canShowExplain: !!content.original && canExplain(contentType),
    ...overrides,
  };
}
