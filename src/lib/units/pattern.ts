const NUMERIC_RANGE_PATTERN = /^(\d+)\s*-\s*(\d+)$/;

export interface NumericRange {
  min: number;
  max: number;
}

export function parseNumericRangePattern(pattern: string): NumericRange | null {
  const match = pattern.trim().match(NUMERIC_RANGE_PATTERN);
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return {
    min: Math.min(start, end),
    max: Math.max(start, end),
  };
}

function parseNumericLocation(location: string): number | null {
  const trimmed = location.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) ? value : null;
}

export function patternToRegExp(pattern: string): RegExp {
  const trimmed = pattern.trim();
  let regexBody = "";

  for (const char of trimmed) {
    if (char === "*") {
      regexBody += ".*";
    } else {
      regexBody += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  return new RegExp(`^${regexBody}$`, "i");
}

export function matchesLocationPattern(location: string, pattern: string): boolean {
  const trimmedLocation = location.trim();
  const trimmedPattern = pattern.trim();
  if (!trimmedLocation || !trimmedPattern) return false;

  const range = parseNumericRangePattern(trimmedPattern);
  if (range) {
    const value = parseNumericLocation(trimmedLocation);
    if (value === null) return false;
    return value >= range.min && value <= range.max;
  }

  return patternToRegExp(trimmedPattern).test(trimmedLocation);
}
