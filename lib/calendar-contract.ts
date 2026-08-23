export interface SourceReference {
  code: string;
  tradition?: string;
  source_tier?: string;
  source_name?: string;
  chapter_verse?: string;
  notes?: string;
}

export interface EvaluationReason {
  code: string;
  text: string;
  source_ref?: SourceReference;
}

export interface ObservanceAlternative {
  variantKey?: string | null;
  profile: {
    calendar: string;
    tradition: string;
  };
  civilDate: string | null;
  monthLabel?: string | null;
  note?: string | null;
}

export interface ClientObservanceResult {
  // Backward compatibility
  date: string;
  slug: string;
  display_name: string;
  emoji: string;
  kind: 'major' | 'vrat' | 'regional';
  tradition: 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'all';
  route_kind: string | null;
  route_slug: string | null;
  description: string;

  // ObservanceResult contract
  id?: string | null;
  festivalId: string;
  variantKey?: string | null;
  status: 'resolved' | 'ambiguous' | 'unresolved' | 'under_review';
  civilDate: string | null;
  /** Candidate dates may be disclosed for review, but never treated as confirmed. */
  candidateDates: string[];
  /** Used only to place a review item in a day/month response; never a confirmed date. */
  reviewPlacementDate: string | null;
  vedicDay?: { start: string; end: string } | null;
  windows?: {
    observance?: { start: string; end: string } | null;
    puja?: { start: string; end: string; name?: string } | null;
    paran?: { start: string; end: string } | null;
  } | null;
  location: {
    label: string;
    lat: number;
    lon: number;
    tz: string;
  };
  profile: {
    calendar: string;
    tradition: string;
  };
  versions: {
    panchangaCore: string;
    calendarProfile: string;
    ruleEngine: string;
    rule: string;
  };
  reasons: EvaluationReason[];
  monthLabel?: {
    month_name: string;
    paksha: string;
    year: number;
    label: string;
  } | null;
  alternatives: ObservanceAlternative[];
  confidence: 'high' | 'medium' | 'low';
  diagnostics: string[];
  sourceRefs: SourceReference[];
  reviewStatus: string;
  isPrimary: boolean;
}

export interface UpcomingCalendarResponse {
  from: string;
  to: string;
  observances: ClientObservanceResult[];
}
