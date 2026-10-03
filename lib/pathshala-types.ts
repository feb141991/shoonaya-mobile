// ─── Pathshala shared types — native ──────────────────────────────────────────
//
// Pathshala catalog and lesson data are owned by the backend API. These types
// describe the open Native response and cache contract.

export interface PathshalaPath {
  id: string;
  title: string;
  description: string;
  title_hi?: string;
  description_hi?: string;
  title_pa?: string;
  description_pa?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tradition: string;
  total_lessons: number;
  duration_days: number;
}
