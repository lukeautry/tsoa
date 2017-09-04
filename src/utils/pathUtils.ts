/**
 * Removes all '/', '\', and spaces from the beginning and end of the path
 * Replaces all '/', '\', and spaces between sections of the path
 * Adds prefix and suffix if supplied
 */
export function normalisePath(path: string, withPrefix?: string, withSuffix?: string, skipPrefixAndSuffixIfEmpty: boolean = true) {
  if (!path && skipPrefixAndSuffixIfEmpty) {
    return '';
  }
  if (!path || typeof path !== 'string') {
    path = '' + path;
  }
  // normalise beginning and end of the path
  let normalised = path.replace(/^[/\\\s]+|[/\\\s]+$/g, '');
  // normalise path between it's sections
  normalised = normalised.replace(/[/\\\s]+|[/\\\s]+/g, '/');
  normalised = withPrefix ? withPrefix + normalised : normalised;
  normalised = withSuffix ? normalised + withSuffix : normalised;
  return normalised;
}
