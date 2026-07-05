import type { PrecisionEngineMode } from '@sangam/panchang-engine';
import type { PathshalaEngine } from '@sangam/pathshala-engine';

// Compile-time proof that native TypeScript can resolve the packed shared package.
export type PanchangEnginePackageProof = PrecisionEngineMode;
export type PathshalaEnginePackageProof = PathshalaEngine;
