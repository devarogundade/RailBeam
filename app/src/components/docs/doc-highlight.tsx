import * as React from "react";

/** VS Code Dark+–inspired token colors */
const tokenClass = {
  plain: "text-[#d4d4d4]",
  comment: "text-[#6a9955]",
  string: "text-[#ce9178]",
  keyword: "text-[#569cd6]",
  number: "text-[#b5cea8]",
  property: "text-[#9cdcfe]",
  function: "text-[#dcdcaa]",
  type: "text-[#4ec9b0]",
  punctuation: "text-[#d4d4d4]/80",
} as const;

type TokenKind = keyof typeof tokenClass;

const TS_KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "await",
  "async",
  "new",
  "return",
  "if",
  "else",
  "typeof",
  "as",
  "true",
  "false",
  "null",
  "undefined",
  "function",
  "class",
  "extends",
  "implements",
  "interface",
  "type",
  "enum",
  "void",
  "never",
  "readonly",
  "private",
  "public",
  "default",
  "throw",
  "try",
  "catch",
  "finally",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "of",
  "in",
  "instanceof",
  "yield",
  "delete",
  "get",
  "set",
  "static",
  "super",
  "this",
]);

const JSON_KEYWORDS = new Set(["true", "false", "null"]);

function Token({ kind, children }: { kind: TokenKind; children: string }) {
  return <span className={tokenClass[kind]}>{children}</span>;
}

function readString(code: string, start: number): number {
  const quote = code[start];
  let i = start + 1;
  while (i < code.length) {
    if (code[i] === "\\") {
      i += 2;
      continue;
    }
    if (code[i] === quote) return i + 1;
    i++;
  }
  return code.length;
}

function readLineComment(code: string, start: number): number {
  const end = code.indexOf("\n", start);
  return end === -1 ? code.length : end;
}

function pushChar(parts: React.ReactNode[], kind: TokenKind, ch: string, key: number) {
  parts.push(<Token key={key} kind={kind}>{ch}</Token>);
}

export function highlightTypeScript(code: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < code.length) {
    const rest = code.slice(i);

    if (rest.startsWith("//")) {
      const end = readLineComment(code, i);
      parts.push(
        <Token key={key++} kind="comment">
          {code.slice(i, end)}
        </Token>,
      );
      i = end;
      continue;
    }

    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = readString(code, i);
      parts.push(
        <Token key={key++} kind="string">
          {code.slice(i, end)}
        </Token>,
      );
      i = end;
      continue;
    }

    const word = /^[a-zA-Z_$][\w$]*/.exec(rest)?.[0];
    if (word) {
      let kind: TokenKind = "plain";
      if (TS_KEYWORDS.has(word)) kind = "keyword";
      else if (/^[A-Z]/.test(word)) kind = "type";
      else if (code[i + word.length] === "(") kind = "function";
      else if (/^\s*:/.test(rest.slice(word.length))) kind = "property";
      parts.push(
        <Token key={key++} kind={kind}>
          {word}
        </Token>,
      );
      i += word.length;
      continue;
    }

    const num = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i.exec(rest)?.[0];
    if (num) {
      parts.push(
        <Token key={key++} kind="number">
          {num}
        </Token>,
      );
      i += num.length;
      continue;
    }

    if (/[{}[\]();,.:<>=+\-*/&|!?]/.test(ch)) {
      pushChar(parts, "punctuation", ch, key++);
    } else {
      pushChar(parts, "plain", ch, key++);
    }
    i++;
  }

  return parts;
}

export function highlightJson(code: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let expectKey = true;

  while (i < code.length) {
    const rest = code.slice(i);
    const ch = code[i];

    if (/\s/.test(ch)) {
      pushChar(parts, "plain", ch, key++);
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const end = readString(code, i);
      const slice = code.slice(i, end);
      const kind: TokenKind = expectKey ? "property" : "string";
      parts.push(
        <Token key={key++} kind={kind}>
          {slice}
        </Token>,
      );
      i = end;
      expectKey = false;
      continue;
    }

    const word = /^[a-zA-Z_$][\w$]*/.exec(rest)?.[0];
    if (word) {
      const kind: TokenKind = JSON_KEYWORDS.has(word) ? "keyword" : "plain";
      parts.push(
        <Token key={key++} kind={kind}>
          {word}
        </Token>,
      );
      i += word.length;
      continue;
    }

    const num = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i.exec(rest)?.[0];
    if (num) {
      parts.push(
        <Token key={key++} kind="number">
          {num}
        </Token>,
      );
      i += num.length;
      expectKey = false;
      continue;
    }

    if (ch === ":") {
      pushChar(parts, "punctuation", ch, key++);
      i++;
      expectKey = false;
      continue;
    }

    if (ch === "," || ch === "{" || ch === "[") {
      pushChar(parts, "punctuation", ch, key++);
      i++;
      if (ch === "{" || ch === ",") expectKey = true;
      continue;
    }

    pushChar(parts, /[}\]]/.test(ch) ? "punctuation" : "plain", ch, key++);
    i++;
  }

  return parts;
}

export function inferDocCodeLanguage(title?: string): "typescript" | "json" {
  if (!title) return "typescript";
  const t = title.toLowerCase();
  if (t.endsWith(".json") || t.includes("package.json")) return "json";
  return "typescript";
}

export function highlightDocCode(code: string, language: "typescript" | "json"): React.ReactNode[] {
  return language === "json" ? highlightJson(code) : highlightTypeScript(code);
}
