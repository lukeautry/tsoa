/**
 * Removes all '/', '\', and spaces from the beginning and end of the path
 * Replaces all '/', '\', and spaces between sections of the path
 * Adds prefix and suffix if supplied
 * Replace ':pathParam' with '{pathParam}'
 */
export function normalisePath(path: string, withPrefix?: string, withSuffix?: string, skipPrefixAndSuffixIfEmpty = true) {
  if ((!path || path === '/') && skipPrefixAndSuffixIfEmpty) {
    return '';
  }
  if (!path || typeof path !== 'string') {
    path = '' + path;
  }
  // normalise beginning and end of the path
  let normalised = path.replace(/^[/\\\s]+|[/\\\s]+$/g, '');
  normalised = withPrefix ? withPrefix + normalised : normalised;
  normalised = withSuffix ? normalised + withSuffix : normalised;
  // normalise / signs amount in all path
  normalised = normalised.replace(/[/\\\s]+/g, '/');
  return normalised;
}

export function convertColonPathParams(path: string) {
  if (!path || typeof path !== 'string') {
    return path;
  }

  const normalised = path.replace(/:([^\/]+)/g, '{$1}');
  return normalised;
}

export function convertBracesPathParams(path: string) {
  return path.replace(/{(\w*)}/g, ':$1');
}
