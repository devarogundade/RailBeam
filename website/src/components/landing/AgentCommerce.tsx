import { Bot, FileText, Split, RefreshCw } from "lucide-react";

const capabilities = [
  { icon: FileText, text: "Quote, invoice, and collect" },
  { icon: Split, text: "Split settlement automatically" },
  { icon: RefreshCw, text: "Manage renewals and receipts" },
];

const AgentCommerce = () => {
  return (
    <section className="py-28 relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border/60">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Agent ERC</p>
                <p className="text-dimmed text-xs">On-chain identity</p>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-success animate-pulse" />
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-end">
                <div className="bg-primary/8 border border-primary/15 rounded-xl rounded-tr-sm px-4 py-2.5 max-w-[260px]">
                  <p className="text-[15px] text-foreground">I need 50 API credits for my team</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl rounded-tl-sm px-4 py-2.5 max-w-[280px]">
                  <p className="text-[15px] text-foreground">That's $250/mo with team billing. I can split across 3 seats. Ready to proceed?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary rounded-xl rounded-tr-sm px-4 py-2.5">
                  <p className="text-[15px] text-primary-foreground font-medium">✓ Payment confirmed — $250.00</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Agent Commerce</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Agents as first-class <span className="gradient-text">payment actors</span>
              </h2>
              <p className="text-semi text-lg leading-relaxed">
                An EIP-based Agent ERC standard: agents as on-chain identities that hold permissions, 
                interact with contracts, and execute payment flows safely.
              </p>
            </div>
            <div className="space-y-3">
              {capabilities.map((c) => (
                <div key={c.text} className="flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <c.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground text-[15px] font-medium">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgentCommerce;
