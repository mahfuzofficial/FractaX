import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/user.api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, FileCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { assetApi } from '@/api/asset.api';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { secondaryApi } from '@/api/secondary.api';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getTxHashDisplay } from '@/utils/blockchain';

const statusConfig = {
  PENDING: { color: 'text-warning bg-warning/10 border-warning/20', icon: Clock, label: 'Pending' },
  APPROVED: { color: 'text-success bg-success/10 border-success/20', icon: CheckCircle, label: 'Approved' },
  REJECTED: { color: 'text-destructive bg-destructive/10 border-destructive/20', icon: AlertTriangle, label: 'Rejected' },
};

const txStatusConfig: Record<string, { color: string; label: string }> = {
  BLOCKCHAIN_CONFIRMED: { color: 'text-success bg-success/10', label: 'Confirmed' },
  DB_CONFIRMED: { color: 'text-warning bg-warning/10', label: 'Pending blockchain' },
  PENDING: { color: 'text-muted-foreground bg-muted', label: 'Processing' },
  FAILED: { color: 'text-destructive bg-destructive/10', label: 'Failed' },
  FAILED_BLOCKCHAIN: { color: 'text-destructive bg-destructive/10', label: 'Failed' },
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const kyc = statusConfig[user?.kycStatus || 'PENDING'];
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: ownershipData, isLoading: loadingOwn } = useQuery({
    queryKey: ['ownerships'],
    queryFn: () => userApi.getOwnerships(),
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => userApi.getTransactions(),
  });

  const { data: myAssetsData } = useQuery({
    queryKey: ['my-assets'],
    queryFn: () => assetApi.getMyListings(),
  });

  const { data: myListingsData } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => secondaryApi.getMyListings(),
    enabled: !!user,
  });

  const myListings = myListingsData?.data || myListingsData || [];

  const cancelListingMutation = useMutation({
    mutationFn: (listingId: string) => secondaryApi.cancelListing(listingId),
    onSuccess: () => {
      toast.success('Listing cancelled');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerships'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    },
  });

  const [sellModal, setSellModal] = useState<{
    assetId: string;
    shareType: 'BASIC' | 'PREMIUM';
    maxQuantity: number;
    assetTitle: string;
  } | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellPrice, setSellPrice] = useState('');

  // 📊 Fetch real-time market insights safely when the sell modal opens
  const { data: insightsResponse } = useQuery({
    queryKey: ['seller-insights', sellModal?.assetId ?? '', sellModal?.shareType ?? 'BASIC'],
    queryFn: async () => {
      if (!sellModal) return null;
      const res = await secondaryApi.getInsights({
        assetId: sellModal.assetId,
        shareType: sellModal.shareType,
      });
      return res.data || res;
    },
    enabled: !!sellModal,
  });

  const insights = insightsResponse?.data || insightsResponse;

  const sellMutation = useMutation({
    mutationFn: () =>
      secondaryApi.createListing({
        assetId: sellModal!.assetId,
        shareType: sellModal!.shareType,
        quantity: sellQty,
        pricePerShare: Number(sellPrice),
      }),
    onSuccess: () => {
      toast.success('Shares listed for sale!');
      setSellModal(null);
      setSellQty(1);
      setSellPrice('');
      queryClient.invalidateQueries({ queryKey: ['ownerships'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to list shares');
    },
  });

  const myAssets = myAssetsData?.data || myAssetsData || [];
  const ownerships = ownershipData?.data || ownershipData || [];
  const transactions = txData?.data || txData || [];

  const [confirmSell, setConfirmSell] = useState(false);
  const [confirmCancelListing, setConfirmCancelListing] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="h-4 w-4" />
              <span className="text-sm">Wallet Balance</span>
            </div>
            <p className="text-2xl font-bold gradient-text">₹{user?.walletBalance?.toLocaleString() ?? '0'}</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Holdings</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{Array.isArray(ownerships) ? ownerships.length : 0}</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FileCheck className="h-4 w-4" />
              <span className="text-sm">KYC Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${kyc.color}`}>
                <kyc.icon className="h-3 w-3" />
                {kyc.label}
              </span>
              {user?.kycStatus !== 'APPROVED' && (
                <Link to="/kyc" className="text-xs text-primary hover:underline">Complete KYC →</Link>
              )}
            </div>
          </div>
        </div>

        {/* Holdings */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Your Holdings</h2>
          </div>
          {loadingOwn ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !Array.isArray(ownerships) || ownerships.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-2">No holdings yet</p>
              <Link to="/marketplace" className="text-primary text-sm hover:underline">Browse marketplace →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Price</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerships.map((o: any) => {
                    const currentPrice = o.asset
                      ? Number(o.asset.totalValuation) / (Number(o.asset.totalShares) || 1)
                      : Number(o.averageBuyPrice);
                    const value = Number(o.quantity) * currentPrice;
                    return (
                      <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate(`/assets/${o.asset?.id || o.assetId}`)} >
                        <td className="p-4">
                          {o.asset?.title || 'Unknown'}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${o.shareType === 'PREMIUM' ? 'bg-accent/10 text-accent' : 'bg-secondary text-secondary-foreground'
                            }`}>
                            {o.shareType}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-foreground">{o.quantity}</td>
                        <td className="p-4 text-right font-mono text-foreground">₹{Number(o.averageBuyPrice).toLocaleString()}</td>
                        <td className="p-4 text-right font-mono font-medium text-primary">
                          ₹{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSellModal({
                                assetId: o.asset?.id || o.assetId,
                                shareType: o.shareType,
                                maxQuantity: o.quantity,
                                assetTitle: o.asset?.title || 'Unknown',
                              });
                              setSellQty(1);
                              setSellPrice('');
                            }}
                            className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* My Listed Assets */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">My Listed Assets</h2>
            <Link to="/assets/create" className="text-sm text-primary hover:underline">+ List new asset</Link>
          </div>
          {!Array.isArray(myAssets) || myAssets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-2">No assets listed yet</p>
              <Link to="/assets/create" className="text-primary text-sm hover:underline">List your first asset →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valuation</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Shares Left</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssets.map((a: any) => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate(`/assets/${a.id}`)} >
                      <td className="p-4 font-medium text-foreground">
                        {a.title}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === 'LIVE' ? 'bg-success/10 text-success' :
                          a.status === 'PENDING_APPROVAL' ? 'bg-warning/10 text-warning' :
                            a.status === 'REJECTED' ? 'bg-destructive/10 text-destructive' :
                              'bg-secondary text-muted-foreground'
                          }`}>
                          {a.status === 'PENDING_APPROVAL' ? 'Pending Approval' : a.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-foreground">
                        ₹{Number(a.totalValuation).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-foreground">
                        {a.sharesAvailableForSale}/{a.totalShares}
                      </td>
                      <td className="p-4 text-right">
                        {a.status === 'REJECTED' && (
                          <Link
                            to={`/assets/edit/${a.id}`}
                            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit & Resubmit
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* My Active Share Listings */}
        {Array.isArray(myListings) && myListings.filter((l: any) => l.status === 'ACTIVE').length > 0 && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">My Active Share Listings</h2>
              <Link to="/my-listings" className="text-xs text-primary hover:underline">View all listings →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Price/Share</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Value</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myListings
                    .filter((l: any) => l.status === 'ACTIVE')
                    .map((listing: any) => (
                      <tr key={listing.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate(`/assets/${listing.asset?.id}`)} >
                        <td className="p-4 font-medium text-foreground">
                          {listing.asset?.title || 'Unknown'}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${listing.shareType === 'PREMIUM'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-secondary text-secondary-foreground'
                            }`}>
                            {listing.shareType}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-foreground">{listing.quantity}</td>
                        <td className="p-4 text-right font-mono text-foreground">
                          ₹{Number(listing.pricePerShare).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-primary">
                          ₹{(Number(listing.pricePerShare) * listing.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setConfirmCancelListing(listing.id)}
                            disabled={cancelListingMutation.isPending}
                            className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
          </div>
          {loadingTx ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !Array.isArray(transactions) || transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No transactions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => {
                    const status = txStatusConfig[tx.status] || txStatusConfig.PENDING;
                    return (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 font-medium text-foreground">{tx.asset?.title || 'Unknown'}</td>
                        <td className="p-4 text-muted-foreground text-sm">{tx.shareType} · {tx.txType}</td>
                        <td className="p-4 text-right font-mono text-foreground">{tx.quantity}</td>
                        <td className="p-4 text-right font-mono text-foreground">₹{Number(tx.totalAmount).toLocaleString()}</td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {tx.blockchainTxHash && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  navigator.clipboard.writeText(tx.blockchainTxHash);
                                  toast.success('Transaction hash copied!');
                                }}
                                className="text-xs text-primary hover:underline font-mono"
                                title={`Click to copy: ${tx.blockchainTxHash}`}
                              >
                                {getTxHashDisplay(tx.blockchainTxHash)} ⛓
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sell Modal */}
        {sellModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-foreground mb-1">List Shares for Sale</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {sellModal.assetTitle} — {sellModal.shareType} shares
              </p>

              {/* 📊 Live Market Alignment Pricing Grid */}
              <div className="grid grid-cols-3 gap-2 bg-secondary/40 p-3 rounded-xl border border-border/60 my-4 text-center">
                {/* Average Buy Price */}
                <div className="flex flex-col justify-center py-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg. Buy</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    {insights?.averageBuyPrice ? `₹${Number(insights.averageBuyPrice).toLocaleString()}` : "₹0"}
                  </p>
                </div>
                
                {/* Base Market Price */}
                <div className="flex flex-col justify-center py-0.5 border-x border-border/60">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Market Price</p>
                  <p className="text-sm font-bold text-blue-400 mt-0.5">
                    {insights?.marketPrice ? `₹${Number(insights.marketPrice).toLocaleString()}` : "₹0"}
                  </p>
                </div>
                
                {/* Last Traded Secondary Price */}
                <div className="flex flex-col justify-center py-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Last Traded</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5">
                    {insights?.lastTradedPrice ? `₹${Number(insights.lastTradedPrice).toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Quantity <span className="text-muted-foreground">(max {sellModal.maxQuantity})</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={sellModal.maxQuantity}
                    value={sellQty}
                    onChange={(e) => setSellQty(Math.min(sellModal.maxQuantity, Math.max(1, Number(e.target.value))))}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Price per share (₹)
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="Set your asking price"
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {sellPrice && (
                  <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total value</span>
                      <span className="font-bold text-primary">
                        ₹{(Number(sellPrice) * sellQty).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setSellModal(null)}
                    className="flex-1 py-2.5 rounded-lg bg-secondary text-muted-foreground text-sm font-medium hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setConfirmSell(true)}
                    disabled={sellMutation.isPending || !sellPrice || Number(sellPrice) <= 0}
                    className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-medium disabled:opacity-50 hover:bg-destructive/90"
                  >
                    {sellMutation.isPending ? 'Listing...' : 'List for Sale'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmCancelListing}
        title="Cancel Listing"
        message="Are you sure you want to cancel this listing? Your shares will be returned to your holdings."
        confirmLabel="Cancel Listing"
        cancelLabel="Keep Listing"
        variant="destructive"
        onConfirm={() => {
          cancelListingMutation.mutate(confirmCancelListing!);
          setConfirmCancelListing(null);
        }}
        onCancel={() => setConfirmCancelListing(null)}
      />

      <ConfirmModal
        isOpen={confirmSell}
        title="Confirm Listing"
        message={`List ${sellQty} ${sellModal?.shareType} share${sellQty > 1 ? 's' : ''} of "${sellModal?.assetTitle}" at ₹${sellPrice}/share (total ₹${(Number(sellPrice) * sellQty).toLocaleString(undefined, { maximumFractionDigits: 2 })})?`}
        confirmLabel="List for Sale"
        variant="destructive"
        onConfirm={() => {
          setConfirmSell(false);
          sellMutation.mutate();
        }}
        onCancel={() => setConfirmSell(false)}
      />
    </AppLayout >
  );
};

export default DashboardPage;