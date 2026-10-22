declare function Route(path: string): (...args: unknown[]) => void;
declare function Get(path: string): (...args: unknown[]) => void;

export interface Failure extends Error {
  code: string;
}

@Route('error-declarations')
export class ErrorDeclarationsController {
  @Get('direct')
  public directError(): Error {
    return new Error('direct');
  }

  @Get('custom')
  public customError(): Failure {
    return { name: 'Failure', message: 'custom', code: 'CUSTOM' };
  }
}
