export function SuccessResponse<T>(name: string | number, description?: string): Function {
  return () => { return; };
}

export function Response<T>(name: string | number, description?: string, example?: T): Function {
  return () => { return; };
}
