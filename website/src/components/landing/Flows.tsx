import { MessageSquare, CreditCard, QrCode, Wallet } from "lucide-react";

const flows = [
  { icon: MessageSquare, title: "Chat → Quote → Pay", description: "Customer chats, gets a quote, pays once, receives access immediately.", step: "01" },
  { icon: CreditCard, title: "Chat → Subscribe", description: "Agent sells a plan, starts recurring billing, manages renewals.", step: "02" },
  { icon: QrCode, title: "QR at Point-of-Sale", description: "Scan a QR, pay by username, split settlement behind the scenes.", step: "03" },
  { icon: Wallet, title: "Wallet-first or Card", description: "Fund from a wallet or choose a familiar card experience.", step: "04" },
];

const Flows = () => {
  return (
    <section className="py-28 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Payment Flows</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            From <span className="gradient-text">conversation</span> to payment
          </h2>
          <p className="text-semi text-lg max-w-lg mx-auto">
            No checkout funnels. No abandoned carts. Just natural flows that close.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/50 rounded-xl overflow-hidden max-w-4xl mx-auto">
          {flows.map((f) => (
            <div key={f.title} className="group relative p-6 bg-background hover:bg-card/80 transition-colors duration-300">
              <span className="text-4xl font-bold text-border/80 group-hover:text-primary/15 transition-colors mb-4 block">
                {f.step}
              </span>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold mb-1.5 text-foreground">{f.title}</h3>
              <p className="text-semi text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Flows;
