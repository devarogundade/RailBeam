export function open(
  _path: string,
  _flags?: string
): Promise<never> {
  return Promise.reject(
    new Error("node:fs/promises is not available in this browser build.")
  );
}
