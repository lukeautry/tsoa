/**
 * Removes all '/', '\', and spaces from the beginning and end of the path
 * Replaces all '/', '\', and spaces between sections of the path
 * Adds prefix and suffix if supplied
 */
export function normalisePath(path: string, withPrefix?: string, withSuffix?: string, skipPrefixAndSuffixIfEmpty: boolean = true) {
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
