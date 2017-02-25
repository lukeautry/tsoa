

export function SuccessResponse(name: string, description?: string): any {
  return () => { return; };
};

export function Response<T>(name: string, description?: string, example?: T): any {
  return () => { return; };
};
