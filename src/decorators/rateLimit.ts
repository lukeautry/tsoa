/**
 * @param {requestCount} number Allowed request in time frame
 * @param {searchWindow} number Time frame
 */
export function RateLimit(requestCount: number, searchWindow: number): Function {
  return () => { return; };
}
