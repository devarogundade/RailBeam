import { Button } from "@/components/ui/button";
import phonePay from "@/assets/phone-pay.png";
import phoneMerchant from "@/assets/phone-merchant.png";
import { ArrowRight, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 glow-bg" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="container mx-auto px-6 pt-28 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm text-primary-light font-medium tracking-wide">The Post-Payment Era</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold leading-[1.06] tracking-tight">
              {/* <span className="gradient-text">Railbeam</span>
              <br /> */}
              <span className="text-foreground">Sell with agents,</span>
              <br />
              <span className="text-semi">not storefronts.</span>
            </h1>

            <p className="text-lg md:text-xl text-semi max-w-md leading-relaxed">
              A programmable payment layer where AI agents can transact safely, instantly, and globally.
              Deploy an agentic sales attendant—not a checkout page.
            </p>

            <div className="flex flex-wrap gap-3">
              <a href="https://pay.railbeam.xyz" target="_blank">
                <Button variant="hero" size="lg" className="text-base px-8 py-6">
                  Launch App <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </a>
              <a href="https://console.railbeam.xyz" target="_blank">
                <Button variant="hero-outline" size="lg" className="text-base px-8 py-6">
                  I'm a Merchant
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-6 pt-2">
              {[
                { label: "x402", sub: "Payment Protocol" },
                { label: "0G", sub: "Storage & Compute" },
                { label: "ERC", sub: "Agent Standard" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  {i > 0 && <div className="w-px h-9 bg-border -ml-6" />}
                  <div>
                    <p className="text-xl font-bold text-foreground">{s.label}</p>
                    <p className="text-sm text-dimmed">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center items-center">
            <div className="relative">
              <img src={phonePay} alt="Railbeam Pay App" width={550} height={'fit-content'} className="relative z-10 drop-shadow-2xl" />
              <img src={phoneMerchant} alt="Railbeam Merchant App" width={650} height={'fit-content'} loading="lazy" className="absolute -right-40 top-0 z-0 drop-shadow-2xl opacity-60 scale-90" />
              <div className="absolute inset-0 -z-10 bg-primary/8 blur-[80px] rounded-full scale-75" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
