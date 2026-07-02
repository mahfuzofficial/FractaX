import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { marketplaceApi } from '@/api/marketplace.api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { Search, TrendingUp, DollarSign, BarChart3, ChevronRight, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'ALL', label: 'All' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'LUXURY_GOODS', label: 'Luxury Goods' },
  { value: 'COLLECTIBLES', label: 'Collectibles' },
  { value: 'ART', label: 'Art' },
  { value: 'VEHICLES', label: 'Vehicles' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_ICONS: Record<string, string> = {
  REAL_ESTATE: '🏢',
  LUXURY_GOODS: '💎',
  COLLECTIBLES: '👟',
  ART: '🎨',
  VEHICLES: '🚗',
  EQUIPMENT: '⚙️',
  OTHER: '📦',
};

const MarketplacePage = () => {
  const { isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('ALL');

  // Transaction Modal State exactly replicating image_44e146.png layout
  const [activeBuyModal, setActiveBuyModal] = useState<{
    assetId: string;
    title: string;
    shareType: 'BASIC' | 'PREMIUM';
    maxQuantity: number;
    pricePerShare: number;
    avgBuy: number;
    marketPrice: number;
    lastTraded: number;
  } | null>(null);

  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', search, page, category],
    queryFn: () => marketplaceApi.browse({ search, page, limit: 12, category }),
  });

  const assets = data?.data?.assets || data?.data || [];
  const totalPages = data?.data?.pagination?.pages || 1;

  // Primary market investment mutation execution hook
  const buyMutation = useMutation({
    mutationFn: ({ assetId, quantity, shareType }: { assetId: string; quantity: number; shareType: string }) =>
      marketplaceApi.investInAsset ? marketplaceApi.investInAsset(assetId, quantity, shareType) : Promise.reject(new Error("Investment endpoint not configured")),
    onSuccess: () => {
      toast.success('Shares purchased successfully!');
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setActiveBuyModal(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Transaction could not be completed.');
    },
  });

  const handleOpenBuyModal = (e: React.MouseEvent, asset: any, selectedType: 'BASIC' | 'PREMIUM') => {
    e.preventDefault(); // Prevents <Link> router navigation wrap from firing off
    
    if (!isAuthenticated) {
      toast.error('Please sign in to execute an order');
      return;
    }

    const ipoPrice = Number(asset.totalValuation) / asset.totalShares;
    const currentPrice = asset.lastTradedPrice ? Number(asset.lastTradedPrice) : ipoPrice;
    const availableShares = asset.sharesAvailableForSale || asset.totalShares;

    setActiveBuyModal({
      assetId: asset.id,
      title: asset.title,
      shareType: selectedType,
      maxQuantity: availableShares,
      pricePerShare: currentPrice,
      // Setting metric layouts exactly matching the visual cards in image_44e146.png
      avgBuy: asset.marketMetrics?.avgBuyPrice || ipoPrice,
      marketPrice: asset.marketMetrics?.currentMarketPrice || currentPrice,
      lastTraded: asset.marketMetrics?.lastTradedPrice || currentPrice,
    });
    setBuyQuantity(1);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Browse and invest in tokenized real-world assets</p>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                category === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-primary/50'
              }`}
            >
              {cat.value !== 'ALL' && <span className="mr-1">{CATEGORY_ICONS[cat.value]}</span>}
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-3 bg-muted rounded w-1/2 mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No assets found</p>
            <p className="text-muted-foreground">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset: any) => {
                const originalPrice = Number(asset.totalValuation) / asset.totalShares;
                const currentPrice = asset.lastTradedPrice
                  ? Number(asset.lastTradedPrice)
                  : originalPrice;
                const priceChange = asset.lastTradedPrice
                  ? ((currentPrice - originalPrice) / originalPrice) * 100
                  : 0;

                return (
                  <Link
                    key={asset.id}
                    to={`/assets/${asset.id}`}
                    className="group glass rounded-xl p-6 transition-all duration-300 hover:border-primary/30 hover:glow block flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                              {CATEGORY_ICONS[asset.category] || '📦'}
                            </span>
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {asset.title}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            by {asset.publisher?.fullName || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {asset.generatesRevenue && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Revenue
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="text-xs">Valuation</span>
                          </div>
                          <p className="font-semibold text-foreground text-sm">
                            ₹{Number(asset.totalValuation).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs">Current Price</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-foreground text-sm">
                              ₹{currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            {priceChange !== 0 && (
                              <span className={`text-[10px] font-medium ${priceChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span>{asset.sharesAvailableForSale} shares available</span>
                        {asset.lastTradedAt && (
                          <span>Last trade: {new Date(asset.lastTradedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Uniform Primary Interaction Action Row */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
                      <button
                        onClick={(e) => handleOpenBuyModal(e, asset, 'BASIC')}
                        className="py-2 px-1.5 rounded-lg bg-secondary/80 text-foreground text-xs font-semibold hover:bg-secondary border border-border/40 transition-colors flex items-center justify-center"
                      >
                        Buy BASIC
                      </button>
                      <button
                        onClick={(e) => handleOpenBuyModal(e, asset, 'PREMIUM')}
                        className="py-2 px-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm transition-colors flex items-center justify-center"
                      >
                        Buy PREMIUM
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* UNIFIED DESIGN SYSTEM DIALOG MODAL (image_44e146.png EDITION) */}
      {activeBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0d111c] border border-border/60 shadow-2xl text-left">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">List Shares for Sale</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeBuyModal.title} — <span className="text-primary font-medium">{activeBuyModal.shareType} shares</span>
                </p>
              </div>
              <button 
                onClick={() => setActiveBuyModal(null)}
                className="p-1 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Price Performance Metrics Section */}
            <div className="grid grid-cols-3 gap-2 my-5 p-3.5 rounded-xl bg-[#131a2a] border border-border/40 text-center select-none">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Avg. Buy</p>
                <p className="text-sm font-bold text-[#10b981] mt-1">
                  ₹{activeBuyModal.avgBuy.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="border-x border-border/20">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Market Price</p>
                <p className="text-sm font-bold text-[#3b82f6] mt-1">
                  ₹{activeBuyModal.marketPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Traded</p>
                <p className="text-sm font-bold text-[#eab308] mt-1">
                  ₹{activeBuyModal.lastTraded.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Input Controls */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quantity <span className="text-[11px] text-muted-foreground font-normal lowercase">(max {activeBuyModal.maxQuantity})</span>
                  </label>
                </div>
                <input
                  type="number"
                  min={1}
                  max={activeBuyModal.maxQuantity}
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(Math.min(activeBuyModal.maxQuantity, Math.max(1, Number(e.target.value))))}
                  className="w-full px-4 py-3 rounded-xl bg-[#182032] border border-border/80 text-foreground text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Price per share (₹)
                </label>
                <div className="w-full px-4 py-3 rounded-xl bg-[#182032]/60 border border-border/50 text-muted-foreground text-base font-bold select-none">
                  ₹{activeBuyModal.pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Aggregated Bill Layout Row */}
              <div className="flex items-center justify-between pt-2 px-1 text-xs">
                <span className="text-muted-foreground font-medium">Estimated Order Cost:</span>
                <span className="text-base font-extrabold text-primary">
                  ₹{(activeBuyModal.pricePerShare * buyQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Operations Rows */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveBuyModal(null)}
                  className="w-full py-3 text-sm font-semibold rounded-xl bg-[#182032] hover:bg-[#202b44] text-foreground border border-border/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={buyMutation.isPending}
                  onClick={() => buyMutation.mutate({ assetId: activeBuyModal.assetId, quantity: buyQuantity, shareType: activeBuyModal.shareType })}
                  className="w-full py-3 text-sm font-semibold rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] disabled:opacity-50 text-white transition-all shadow-md shadow-red-950/20"
                >
                  {buyMutation.isPending ? 'Processing...' : 'List for Sale'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MarketplacePage;