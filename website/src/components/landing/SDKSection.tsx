const lines = [
  { num: 1, tokens: [{ t: "keyword", v: "import" }, { t: "text", v: " { " }, { t: "type", v: "Railbeam" }, { t: "text", v: " } " }, { t: "keyword", v: "from" }, { t: "string", v: " '@railbeam/sdk'" }] },
  { num: 2, tokens: [] },
  { num: 3, tokens: [{ t: "keyword", v: "const" }, { t: "text", v: " rb = " }, { t: "keyword", v: "new" }, { t: "type", v: " Railbeam" }, { t: "text", v: "({ " }, { t: "param", v: "apiKey" }, { t: "text", v: ": " }, { t: "string", v: "'rb_live_...'" }, { t: "text", v: " })" }] },
  { num: 4, tokens: [] },
  { num: 5, tokens: [{ t: "comment", v: "// One-time payment with automatic splits" }] },
  { num: 6, tokens: [{ t: "keyword", v: "const" }, { t: "text", v: " payment = " }, { t: "keyword", v: "await" }, { t: "text", v: " rb." }, { t: "method", v: "payments" }, { t: "text", v: "." }, { t: "method", v: "create" }, { t: "text", v: "({" }] },
  { num: 7, tokens: [{ t: "param", v: "  amount" }, { t: "text", v: ": " }, { t: "number", v: "49_99" }, { t: "text", v: "," }] },
  { num: 8, tokens: [{ t: "param", v: "  currency" }, { t: "text", v: ": " }, { t: "string", v: "'USD'" }, { t: "text", v: "," }] },
  { num: 9, tokens: [{ t: "param", v: "  method" }, { t: "text", v: ": " }, { t: "string", v: "'x402'" }, { t: "text", v: "," }] },
  { num: 10, tokens: [{ t: "param", v: "  splits" }, { t: "text", v: ": [" }] },
  { num: 11, tokens: [{ t: "text", v: "    { " }, { t: "param", v: "address" }, { t: "text", v: ": " }, { t: "string", v: "'0xCreator...'" }, { t: "text", v: ", " }, { t: "param", v: "pct" }, { t: "text", v: ": " }, { t: "number", v: "85" }, { t: "text", v: " }," }] },
  { num: 12, tokens: [{ t: "text", v: "    { " }, { t: "param", v: "address" }, { t: "text", v: ": " }, { t: "string", v: "'0xPlatform...'" }, { t: "text", v: ", " }, { t: "param", v: "pct" }, { t: "text", v: ": " }, { t: "number", v: "15" }, { t: "text", v: " }," }] },
  { num: 13, tokens: [{ t: "text", v: "  ]," }] },
  { num: 14, tokens: [{ t: "text", v: "})" }] },
  { num: 15, tokens: [] },
  { num: 16, tokens: [{ t: "comment", v: "// Recurring subscription with agent management" }] },
  { num: 17, tokens: [{ t: "keyword", v: "const" }, { t: "text", v: " sub = " }, { t: "keyword", v: "await" }, { t: "text", v: " rb." }, { t: "method", v: "subscriptions" }, { t: "text", v: "." }, { t: "method", v: "create" }, { t: "text", v: "({" }] },
  { num: 18, tokens: [{ t: "param", v: "  plan" }, { t: "text", v: ": " }, { t: "string", v: "'pro_monthly'" }, { t: "text", v: "," }] },
  { num: 19, tokens: [{ t: "param", v: "  customer" }, { t: "text", v: ": " }, { t: "string", v: "'user_abc'" }, { t: "text", v: "," }] },
  { num: 20, tokens: [{ t: "param", v: "  chatAgent" }, { t: "text", v: ": " }, { t: "keyword", v: "true" }, { t: "text", v: "," }] },
  { num: 21, tokens: [{ t: "text", v: "})" }] },
];

const tokenColors: Record<string, string> = {
  keyword: "text-[hsl(var(--primary))]",
  type: "text-[hsl(18,88%,64%)]",
  string: "text-[hsl(var(--success))]",
  number: "text-[hsl(var(--primary-light))]",
  comment: "text-dimmed italic",
  method: "text-[hsl(210,80%,70%)]",
  param: "text-[hsl(var(--foreground))]",
  text: "text-semi",
};

const SDKSection = () => {
  return (
    <section className="py-28 relative">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <p className="text-primary font-medium tracking-wide uppercase text-xs">Developer SDK</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              TypeScript-first <span className="gradient-text">payment SDK</span>
            </h2>
            <p className="text-semi text-base leading-relaxed max-w-md">
              Create payment flows, trigger splits, connect x402 resources, 
              and power chat-to-pay experiences—all in a few lines.
            </p>
            <ul className="space-y-2.5 text-semi text-sm">
              {["One-time & recurring flows", "Splits & settlements", "x402 resource binding", "Chat-to-pay integration"].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Syntax highlighted code block */}
          <div className="rounded-xl border border-border bg-[hsl(0,0%,7%)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
              <span className="ml-2 text-[10px] text-dimmed font-mono tracking-wide">payment.ts</span>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="text-[13px] leading-6 font-mono w-full">
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.num} className="group">
                      <td className="text-right pr-4 select-none text-dimmed text-[11px] w-8 align-top opacity-40 group-hover:opacity-70 transition-opacity">
                        {line.num}
                      </td>
                      <td className="whitespace-pre">
                        {line.tokens.length === 0 ? (
                          <span>&nbsp;</span>
                        ) : (
                          line.tokens.map((tok, i) => (
                            <span key={i} className={tokenColors[tok.t] || "text-semi"}>
                              {tok.v}
                            </span>
                          ))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SDKSection;
