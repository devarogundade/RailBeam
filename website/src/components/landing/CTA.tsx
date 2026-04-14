import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-28 relative">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground">
            Ready for the <span className="gradient-text">post-payment era</span>?
          </h2>
          <p className="text-semi text-lg leading-relaxed">
            Stop building storefronts. Start deploying attendants.
            Chat-to-pay infrastructure for the modern web.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a href="https://railbeam-merchant.netlify.app" target="_blank">
              <Button variant="hero" size="lg" className="text-base px-8 py-6">
                Start Building <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </a>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6">
              Read the Docs
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
