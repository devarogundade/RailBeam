const Footer = () => {
  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-foreground">Railbeam</span>
          </div>
          <p className="text-dimmed text-sm">
            The post-payment era. Accept payments. Deploy an attendant.
          </p>
          <p className="text-dimmed text-sm">© 2026 Railbeam. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
