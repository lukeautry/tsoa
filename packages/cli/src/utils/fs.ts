import * as fs from 'fs';
import { promisify } from 'util';

export const fsExists = promisify(fs.exists);
export const fsMkDir = promisify(fs.mkdir);
export const fsWriteFile = promisify(fs.writeFile);
export const fsReadFile = promisify(fs.readFile);
