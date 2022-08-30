import { extname } from 'path';
import { sync } from 'glob';

/**
 * Loads all exported classes from the given directory.
 */
export function importClassesFromDirectories(directories: string[], formats = ['.ts']): string[] {
  const allFiles = directories.reduce((allDirs, dir) => {
    // glob docs says: Please only use forward-slashes in glob expressions.
    // therefore do not do any normalization of dir path
    return allDirs.concat(sync(dir));
  }, [] as string[]);

  return allFiles.filter(file => {
    const dtsExtension = file.substring(file.length - 5, file.length);
    return formats.indexOf(extname(file)) !== -1 && dtsExtension !== '.d.ts';
  });
}
