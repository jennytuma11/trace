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
  return patternToRegExp(trimmedPattern).test(trimmedLocation);
}
