export function safeFromJson(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
