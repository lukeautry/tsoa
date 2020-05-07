export * from '@tsoa/cli/dist/cli';
import { runCLI } from '@tsoa/cli/dist/cli';

if (!module.parent) runCLI();
