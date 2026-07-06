// ─── Pathshala shared types — native ──────────────────────────────────────────
//
// PathshalaPath is the only piece of the old local pathshala-paths.ts fixture
// still needed natively; everything else (SEED_PATHS content, lesson data) now
// comes from /api/pathshala/paths and /api/pathshala/paths/[pathId].

export interface PathshalaPath {
  id: string;
  title: string;
  description: string;
  title_hi?: string;
  description_hi?: string;
  title_pa?: string;
  description_pa?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  proRequired: boolean;
  tradition: string;
  total_lessons: number;
  duration_days: number;
}
