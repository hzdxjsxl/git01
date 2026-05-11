export interface Difference {
  position: number;
  referenceBase: string;
  variantBase: string;
  type: 'mismatch' | 'insertion' | 'deletion';
}

export interface AlignmentResult {
  differences: Difference[];
  totalPositions: number;
  matchedCount: number;
  mismatchedCount: number;
  similarity: number;
}

export interface SlidingWindowMatch {
  start: number;
  end: number;
  matches: number;
  mismatches: number;
}

const DEFAULT_WINDOW_SIZE = 50;
const DEFAULT_STEP_SIZE = 1;

export class SequenceAligner {
  private reference: string;
  private variant: string;
  private maxLength: number;

  constructor(reference: string, variant: string) {
    this.reference = reference;
    this.variant = variant;
    this.maxLength = Math.max(reference.length, variant.length);
  }

  compareBaseByBase(): Difference[] {
    const differences: Difference[] = [];
    const minLength = Math.min(this.reference.length, this.variant.length);

    for (let i = 0; i < minLength; i++) {
      const refBase = this.reference[i];
      const varBase = this.variant[i];

      if (refBase !== varBase) {
        differences.push({
          position: i,
          referenceBase: refBase,
          variantBase: varBase,
          type: 'mismatch'
        });
      }
    }

    for (let i = minLength; i < this.reference.length; i++) {
      differences.push({
        position: i,
        referenceBase: this.reference[i],
        variantBase: '-',
        type: 'deletion'
      });
    }

    for (let i = minLength; i < this.variant.length; i++) {
      differences.push({
        position: i,
        referenceBase: '-',
        variantBase: this.variant[i],
        type: 'insertion'
      });
    }

    return differences;
  }

  slidingWindowCompare(
    windowSize: number = DEFAULT_WINDOW_SIZE,
    stepSize: number = DEFAULT_STEP_SIZE
  ): SlidingWindowMatch[] {
    const matches: SlidingWindowMatch[] = [];
    const minLength = Math.min(this.reference.length, this.variant.length);

    for (let start = 0; start + windowSize <= minLength; start += stepSize) {
      let windowMatches = 0;
      let windowMismatches = 0;

      for (let i = 0; i < windowSize; i++) {
        if (this.reference[start + i] === this.variant[start + i]) {
          windowMatches++;
        } else {
          windowMismatches++;
        }
      }

      matches.push({
        start,
        end: start + windowSize - 1,
        matches: windowMatches,
        mismatches: windowMismatches
      });
    }

    return matches;
  }

  findAllDifferences(): AlignmentResult {
    const differences = this.compareBaseByBase();
    const matchedCount = this.maxLength - differences.length;

    return {
      differences,
      totalPositions: this.maxLength,
      matchedCount,
      mismatchedCount: differences.length,
      similarity: this.maxLength > 0 ? matchedCount / this.maxLength : 0
    };
  }

  getDifferencesInRange(start: number, end: number): Difference[] {
    const differences: Difference[] = [];
    const effectiveStart = Math.max(0, start);
    const effectiveEnd = Math.min(this.maxLength, end);

    for (let i = effectiveStart; i < effectiveEnd; i++) {
      const refBase = i < this.reference.length ? this.reference[i] : '-';
      const varBase = i < this.variant.length ? this.variant[i] : '-';

      if (refBase !== varBase) {
        differences.push({
          position: i,
          referenceBase: refBase,
          variantBase: varBase,
          type: this.getDifferenceType(refBase, varBase)
        });
      }
    }

    return differences;
  }

  private getDifferenceType(refBase: string, varBase: string): Difference['type'] {
    if (refBase === '-') return 'insertion';
    if (varBase === '-') return 'deletion';
    return 'mismatch';
  }

  getBaseAtPosition(position: number): { reference: string; variant: string } {
    return {
      reference: position < this.reference.length ? this.reference[position] : '-',
      variant: position < this.variant.length ? this.variant[position] : '-'
    };
  }

  getReference(): string {
    return this.reference;
  }

  getVariant(): string {
    return this.variant;
  }

  getLengths(): { reference: number; variant: number } {
    return {
      reference: this.reference.length,
      variant: this.variant.length
    };
  }
}

export function createSequenceAligner(reference: string, variant: string): SequenceAligner {
  return new SequenceAligner(reference, variant);
}

export function compareSequences(reference: string, variant: string): AlignmentResult {
  const aligner = new SequenceAligner(reference, variant);
  return aligner.findAllDifferences();
}

export function findDifferencesInRange(
  reference: string,
  variant: string,
  start: number,
  end: number
): Difference[] {
  const aligner = new SequenceAligner(reference, variant);
  return aligner.getDifferencesInRange(start, end);
}
