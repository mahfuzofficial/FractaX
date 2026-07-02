import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { secondaryApi } from '@/api/secondary.api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { Search, Tag, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';

const CATEGORY_ICONS: Record<string, string> = {
  REAL_ESTATE: '🏢',
  LUXURY_GOODS: '💎',
  COLLECTIBLES: '👟',
  ART: '🎨',
  VEHICLES: '🚗',
  EQUIPMENT: '⚙️',
  OTHER: '📦',
};

const SecondaryMarketPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  // Modal State for Purchasing Shares
  const [activeBuyModal, setActiveBuyModal] = useState<{
    listingId: string;
    assetTitle: string;
    shareType: string;
    maxQuantity: number;
    pricePerShare: number;
    avgBuy: number;
    marketPrice: number;
    lastTraded: number;
  } | null>(null);

  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['secondary-listings', search, page],
    queryFn: () => secondaryApi.getAllListings({ search, page, limit: 12 }),
  });

  const listings = data?.data?.listings || [];
  const totalPages = data?.data?.pagination?.pages || 1;

  const buyMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      secondaryApi.buyFromListing(id, quantity),
    onSuccess: () => {
      toast.success('Shares purchased successfully!');
      queryClient.invalidateQueries({ queryKey: ['secondary-listings'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setActiveBuyModal(null); // Close the checkout modal
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Purchase failed');
    },
  });

  const handleOpenBuyModal = (listing: any) => {
    const ipoPrice = Number(listing.asset?.totalValuation) / listing.asset?.totalShares;
    
    setActiveBuyModal({
      listingId: listing.id,
      assetTitle: listing.asset?.title || 'Asset Shares',
      shareType: listing.shareType,
      maxQuantity: listing.quantity,
      pricePerShare: Number(listing.pricePerShare),
      // Mapping parameters to match the stylized dashboard metrics layout
      avgBuy: listing.asset?.marketMetrics?.avgBuyPrice || ipoPrice,
      marketPrice: listing.asset?.marketMetrics?.currentMarketPrice || Number(listing.pricePerShare),
      lastTraded: listing.asset?.marketMetrics?.lastTradedPrice || Number(listing.pricePerShare),
    });
    setBuyQuantity(1); // Default initial unit purchase request
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Secondary Market</h1>
          <p className="text-muted-foreground">Buy shares directly from other investors</p>
        </div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-3 bg-muted rounded w-1/2 mb-6" />
                <div className="h-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No listings yet</p>
            <p className="text-muted-foreground">Be the first to list your shares for resale</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing: any) => {
                const isOwnListing = user?.id === listing.sellerId;
                const ipoPrice = Number(listing.asset?.totalValuation) / listing.asset?.totalShares;
                const priceChange = ((Number(listing.pricePerShare) - ipoPrice) / ipoPrice) * 100;

                return (
                  <div key={listing.id} className="glass rounded-xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span>{CATEGORY_ICONS[listing.asset?.category] || '📦'}</span>
                            <h3 className="font-semibold text-foreground line-clamp-1">{listing.asset?.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">by {listing.seller?.fullName}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          listing.shareType === 'PREMIUM'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {listing.shareType}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground mb-1">Asking Price/Share</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="font-bold text-primary text-sm">
                              ₹{Number(listing.pricePerShare).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            {priceChange !== 0 && (
                              <span className={`text-[10px] flex items-center font-medium ${
                                priceChange > 0 ? 'text-emerald-500' : 'text-rose-500'
                              }`}>
                                {priceChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {Math.abs(priceChange).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground mb-1">Available Supply</p>
                          <p className="font-bold text-foreground text-sm">{listing.quantity} units</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isOwnListing ? (
                        <div className="w-full py-2.5 rounded-lg bg-secondary/60 text-muted-foreground text-sm text-center font-medium border border-border/40">
                          Your Active Listing
                        </div>
                      ) : !isAuthenticated ? (
                        <a
                          href="/login"
                          className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:bg-primary/90 transition-all"
                        >
                          Sign in to buy
                        </a>
                      ) : (
                        <button
                          onClick={() => handleOpenBuyModal(listing)}
                          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Buy Shares
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground font-medium">Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* RWA PLATFORM UNIFIED TRANSACTION MODAL */}
      {activeBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0d111c] border border-border/60 shadow-2xl text-left">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold text-foreground">Purchase Shares</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeBuyModal.assetTitle} — <span className="text-primary font-medium">{activeBuyModal.shareType} shares</span>
                </p>
              </div>
              <button 
                onClick={() => setActiveBuyModal(null)}
                className="p-1 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Performance Panel */}
            <div className="grid grid-cols-3 gap-2 my-5 p-3.5 rounded-xl bg-[#131a2a] border border-border/40 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Avg. Buy</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  ₹{activeBuyModal.avgBuy.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="border-x border-border/20">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Market Price</p>
                <p className="text-sm font-bold text-blue-400 mt-1">
                  ₹{activeBuyModal.marketPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Last Traded</p>
                <p className="text-sm font-bold text-amber-400 mt-1">
                  ₹{activeBuyModal.lastTraded.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </label>
                  <span className="text-xs text-muted-foreground font-medium">
                    (max {activeBuyModal.maxQuantity})
                  </span>
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
                  Execution Price per share (₹)
                </label>
                <div className="w-full px-4 py-3 rounded-xl bg-[#182032]/60 border border-border/40 text-muted-foreground text-base font-bold select-none">
                  ₹{activeBuyModal.pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Order Total Overview */}
              <div className="flex items-center justify-between pt-2 px-1 text-sm">
                <span className="text-muted-foreground font-medium">Total Execution Cost:</span>
                <span className="text-lg font-extrabold text-primary">
                  ₹{(activeBuyModal.pricePerShare * buyQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Operations */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveBuyModal(null)}
                  className="w-full py-3 text-sm font-semibold rounded-xl bg-secondary/50 text-foreground hover:bg-secondary border border-border/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={buyMutation.isPending}
                  onClick={() => buyMutation.mutate({ id: activeBuyModal.listingId, quantity: buyQuantity })}
                  className="w-full py-3 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-900/20 transition-all"
                >
                  {buyMutation.isPending ? 'Executing...' : 'Confirm Purchase'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default SecondaryMarketPage;