export class FileResult {
  public path?: string;
  public data?: any;
  public filename?: string;

  constructor(initial: FileResult = {}) {
    this.path = initial.path;
    this.data = initial.data;
    this.filename = initial.filename;
  }

  public static newInstance(initial: FileResult = {}): FileResult {
    return new FileResult(initial);
  }
}
