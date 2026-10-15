/**
 * Institution Profile Registry — index
 *
 * Usage:
 *   const guard = GuardBrasil.create({ customPatterns: myProfile.patterns });
 *
 * Contributing a new profile:
 *   1. Create `<institution>.ts` in this directory
 *   2. Export an `InstitutionProfile` following the type contract
 *   3. Add patterns with `confidence: 'low'`
 *   4. Run HITL validation on a synthetic corpus
 *   5. Export as JSON for sharing: profiles are self-contained and require no code change to use
 */

export { computeConfidenceFromHITL, HITL_CONFIDENCE_THRESHOLDS } from './types.js';
export type { InstitutionProfile, HITLReviewResult } from './types.js';
