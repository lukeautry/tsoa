import { extname, normalize } from 'path';
import { sync } from 'glob';

/**
 * Loads all exported classes from the given directory.
 */
export function importClassesFromDirectories(directories: string[], formats = ['.ts']): string[] {
  const allFiles = directories.reduce((allDirs, dir) => {
    return allDirs.concat(sync(normalize(dir)));
  }, [] as string[]);

  return allFiles.filter(file => {
    const dtsExtension = file.substring(file.length - 5, file.length);
    return formats.indexOf(extname(file)) !== -1 && dtsExtension !== '.d.ts';
  });
}
