
export function DefaultResponse<T>(description?: string, model?: T): any {
  return () => { return; };
};

export function Response<T>(name: string, description?: string, model?: T): any {
  return () => { return; };
};
