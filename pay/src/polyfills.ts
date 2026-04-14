import { Buffer } from "buffer";
import process from "process";

// readable-stream (pulled in via crypto / create-hash) uses
// `!process.browser && process.version.slice(...)`. A partial global
// `process` without `browser` or `version` throws at `.slice`.
globalThis.process = process;
globalThis.Buffer = Buffer;
