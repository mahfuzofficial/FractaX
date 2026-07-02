import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, LayoutDashboard, Store, PlusCircle, Shield, FileCheck, Menu, X, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/api/profile.api';

export const Navbar = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // This watches the 'profile' query; it won't change your UI until you use the data
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
    enabled: isAuthenticated,
  });

  // This line ensures if fresh data (profile) exists, it's used; otherwise, keep the old 'user'
  const displayUser = profile || user;

  const navLinks = [
    { to: '/marketplace', label: 'Marketplace', icon: Store },
    { to: '/secondary', label: 'Resale', icon: TrendingUp },
    ...(isAuthenticated
      ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/assets/create', label: 'List Asset', icon: PlusCircle },
        { to: '/kyc', label: 'KYC', icon: FileCheck },
        ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
      ]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="gradient-text font-bold text-lg">F</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">FractaX</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono font-medium text-primary">
                    ₹{displayUser?.walletBalance?.toLocaleString() ?? '0'}
                  </span>
                </div>
                <a href="/profile" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary px-3 py-2 rounded-lg transition-colors cursor-pointer">
                  {displayUser?.fullName}
                </a>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {isAuthenticated && displayUser && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-primary/10 border border-primary/20">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono font-medium text-primary">
                  ₹{displayUser?.walletBalance?.toLocaleString() ?? '0'}
                </span>
                <a href="/profile" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary px-3 py-2 rounded-lg transition-colors cursor-pointer">
                  {displayUser.fullName}
                </a>
              </div>
            )}
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
              <div className="flex flex-col gap-1 pt-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground text-center">
                  Get Started
                </Link>
              </div>
          </div>
        </div>
      )}
    </nav>
  );
};
