import { 
  CreditCard, MessageSquare, RefreshCw, Split, QrCode, Wallet,
  Database, Cpu, Lock
} from "lucide-react";

const features = [
  { icon: CreditCard, title: "x402 Payments", description: "Native payment primitives for paywalls, API monetization, and agent-to-agent commerce." },
  { icon: MessageSquare, title: "Agentic Sales Agent", description: "An AI salesperson that qualifies, handles objections, and closes—then takes payment." },
  { icon: RefreshCw, title: "Recurrent Transactions", description: "Subscriptions and usage-based billing for SaaS, memberships, and retainers." },
  { icon: Split, title: "Split Payments", description: "Auto-route funds to partners, affiliates, and creators with on-chain logic." },
  { icon: QrCode, title: "Username + QR Pay", description: "Consumer-friendly transfers. Share a QR for instant payment—no addresses needed." },
  { icon: Wallet, title: "Cards + Wallet Rails", description: "Support card-like UX and wallet-native rails so users pay how they prefer." },
];

const infra = [
  { icon: Database, title: "0G Storage", description: "Decentralized storage for app assets and payment metadata." },
  { icon: Cpu, title: "0G Compute", description: "Run compute workloads powering agent experiences and payment automation." },
  { icon: Lock, title: "End-to-End Encryption", description: "Payments and commerce remain private by default." },
];

const Features = () => {
  return (
    <section className="py-28 relative">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Capabilities</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5">
            Everything you need to <span className="gradient-text">sell with agents</span>
          </h2>
          <p className="text-semi text-lg max-w-xl mx-auto">
            From one-time payments to recurring billing, split settlements, and chat-to-pay flows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden mb-20">
          {features.map((f) => (
            <div key={f.title} className="group p-8 bg-background hover:bg-card/80 transition-colors duration-300">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
              <p className="text-semi text-[15px] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-12">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Infrastructure</p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Storage, compute & trust <span className="gradient-text">built in</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden">
          {infra.map((f) => (
            <div key={f.title} className="p-8 bg-background hover:bg-card/80 transition-colors duration-300 text-center">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
              <p className="text-semi text-[15px] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
