import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import AgentCommerce from "@/components/landing/AgentCommerce";
import SDKSection from "@/components/landing/SDKSection";
import Flows from "@/components/landing/Flows";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <div id="features"><Features /></div>
      <div id="agents"><AgentCommerce /></div>
      <div id="sdk"><SDKSection /></div>
      <div id="flows"><Flows /></div>
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
