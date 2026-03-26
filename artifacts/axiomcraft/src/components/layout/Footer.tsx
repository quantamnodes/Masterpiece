import { Cpu, Github, Twitter, Disc } from "lucide-react";
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-sm">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <span className="font-heading font-bold text-lg tracking-wider text-foreground">
                AXIOM<span className="text-primary">CRAFT</span>
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm font-sans leading-relaxed">
              Engineered for those who refuse compromise. We build the architecture of tomorrow, today. Premium components for uncompromising performance.
            </p>
          </div>
          
          <div>
            <h4 className="font-heading font-bold uppercase tracking-wider mb-4 text-foreground">Hardware</h4>
            <ul className="space-y-3">
              <li><Link to="/products?category=gpus" className="text-muted-foreground hover:text-primary transition-colors text-sm">Graphics Cards</Link></li>
              <li><Link to="/products?category=cpus" className="text-muted-foreground hover:text-primary transition-colors text-sm">Processors</Link></li>
              <li><Link to="/products?category=motherboards" className="text-muted-foreground hover:text-primary transition-colors text-sm">Motherboards</Link></li>
              <li><Link to="/products?category=memory" className="text-muted-foreground hover:text-primary transition-colors text-sm">Memory</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold uppercase tracking-wider mb-4 text-foreground">Explore</h4>
            <ul className="space-y-3 mb-6">
              <li><Link to="/deals" className="text-muted-foreground hover:text-primary transition-colors text-sm">Deal Vault</Link></li>
              <li><Link to="/build" className="text-muted-foreground hover:text-primary transition-colors text-sm">PC Builder</Link></li>
              <li><Link to="/compare" className="text-muted-foreground hover:text-primary transition-colors text-sm">Compare Hardware</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">Contact Us</Link></li>
              <li><Link to="/account" className="text-muted-foreground hover:text-primary transition-colors text-sm">My Account</Link></li>
            </ul>
            <h4 className="font-heading font-bold uppercase tracking-wider mb-4 text-foreground">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-background border border-border flex items-center justify-center rounded-sm hover:border-primary hover:text-primary transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-background border border-border flex items-center justify-center rounded-sm hover:border-primary hover:text-primary transition-all">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-background border border-border flex items-center justify-center rounded-sm hover:border-primary hover:text-primary transition-all">
                <Disc className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground font-mono">
            &copy; {new Date().getFullYear()} AXIOMCRAFT_SYSTEMS. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground font-mono">
            <a href="#" className="hover:text-primary">TERMS</a>
            <a href="#" className="hover:text-primary">PRIVACY</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
