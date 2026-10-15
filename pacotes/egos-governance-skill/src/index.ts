/**
 * @egosbr/governance-skill
 * Evidence-first governance patterns for LLM-driven projects
 */

export interface ClaimValidation {
  ok: boolean;
  violations: Array<{
    claim: string;
    missing: string[];
    line?: number;
  }>;
}

export interface EvidenceGateConfig {
  strict?: boolean;
  requiredFields?: string[];
  gracePeriodDays?: number;
}

/**
 * Evidence Gate validates that all claims in markdown have backing evidence.
 * Claims must include: VERIFIED_AT, method, evidence_path:line
 */
export class EvidenceGate {
  private config: EvidenceGateConfig;

  constructor(config: EvidenceGateConfig = {}) {
    this.config = {
      strict: config.strict ?? false,
      requiredFields: config.requiredFields ?? ['VERIFIED_AT', 'method', 'evidence_path'],
      gracePeriodDays: config.gracePeriodDays ?? 7,
    };
  }

  validate(claims: Array<{ text: string; file: string; line?: number }>): ClaimValidation {
    const violations: ClaimValidation['violations'] = [];

    for (const claim of claims) {
      const missing: string[] = [];

      // Check for required evidence fields
      for (const field of this.config.requiredFields!) {
        if (!claim.text.includes(field)) {
          missing.push(field);
        }
      }

      if (missing.length > 0) {
        violations.push({
          claim: claim.text,
          missing,
          line: claim.line,
        });
      }
    }

    return {
      ok: violations.length === 0,
      violations,
    };
  }
}

/**
 * Doc-Drift Shield detects broken documentation links and references.
 */
export class DocDriftShield {
  checkRefs(content: string): string[] {
    const refPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const broken: string[] = [];

    let match;
    while ((match = refPattern.exec(content)) !== null) {
      const [, text, path] = match;
      // In real implementation, would check if path exists
      // For now, return pattern for external validation
      if (path.includes('undefined') || path.includes('null')) {
        broken.push(`${text} → ${path}`);
      }
    }

    return broken;
  }
}

/**
 * SSOT Validator ensures scored tables have proper evidence anchoring.
 * Flags unverified percentage/grade columns.
 */
export class SSOTValidator {
  private requiredColumns = ['Verified', 'Evidence', 'Method'];

  validate(markdown: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Look for percentage/grade columns without AUTO-GEN protection
    if (markdown.includes('%') || markdown.includes('Grade')) {
      const hasAutoGen = markdown.includes('<!-- AUTO-GEN-BEGIN');
      if (!hasAutoGen) {
        issues.push('Scored table detected without AUTO-GEN wrapper');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

/**
 * Claim-Check scans repository for phantom-prone patterns.
 */
export class ClaimCheck {
  async scan(dirPath: string): Promise<{ phantomRisk: number; findings: string[] }> {
    // In real implementation, would recursively scan markdown files
    // For now, return interface pattern
    return {
      phantomRisk: 0,
      findings: [],
    };
  }
}

export default {
  EvidenceGate,
  DocDriftShield,
  SSOTValidator,
  ClaimCheck,
};
