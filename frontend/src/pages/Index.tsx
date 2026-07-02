import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, Shield, TrendingUp, Layers, Zap } from 'lucide-react';

const Index = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Hero */}
        <div className="text-center py-20 lg:py-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Blockchain-Powered Asset Tokenization
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            Invest in <span className="gradient-text">Real World</span>
            <br />Assets, Tokenized
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Fractional ownership of property, equipment, and art — secured on the blockchain.
            Buy shares, earn revenue, and build your portfolio.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? '/marketplace' : '/register'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all glow"
            >
              {isAuthenticated ? 'Browse Marketplace' : 'Get Started'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-all border border-border"
            >
              Explore Assets
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 pb-20">
          {[
            {
              icon: Layers,
              title: 'Fractional Ownership',
              description: 'Own a piece of high-value assets. No minimum investment barriers — buy as many shares as you want.',
            },
            {
              icon: Shield,
              title: 'Blockchain Verified',
              description: 'Every transaction is recorded on-chain. Immutable proof of ownership you can trust.',
            },
            {
              icon: TrendingUp,
              title: 'Revenue Sharing',
              description: 'Premium shares earn a portion of the asset\'s revenue. Passive income from real-world assets.',
            },
          ].map((feature) => (
            <div key={feature.title} className="stat-card group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
