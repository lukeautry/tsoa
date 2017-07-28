export function SuccessResponse(name: string | number, description?: string): any {
  return () => { return; };
}

export function Response<T>(name: string | number, description?: string, example?: T): any {
  return () => { return; };
}
