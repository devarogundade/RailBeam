/** Minimal `fs` surface for bundling @0gfoundation/0g-ts-sdk in the browser (upload-only). */

export function existsSync(_p: string): boolean {
  return false;
}

export function lstatSync(_p: string): { isDirectory: () => boolean } {
  return { isDirectory: () => false };
}

export function mkdirSync(_p: string, _opts?: object): void {}

export function openSync(_p: string, _flag?: string): number {
  return 0;
}

export function readFileSync(_p: string): Uint8Array {
  return new Uint8Array();
}

export function writeSync(_fd: number, _buf: Uint8Array): void {}

export function closeSync(_fd: number): void {}

export function unlinkSync(_p: string): void {}

export function appendFileSync(_path: string, _data: Uint8Array): void {
  throw new Error("appendFileSync is not supported in this browser build.");
}

export function createWriteStream(_path: string) {
  return {
    on: () => {},
    write: () => true,
    end: () => {},
  };
}

export function createReadStream(_path: string) {
  return {
    pipe: () => ({}),
  };
}

const fs = {
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
  closeSync,
  unlinkSync,
  appendFileSync,
  createWriteStream,
  createReadStream,
};

export default fs;
