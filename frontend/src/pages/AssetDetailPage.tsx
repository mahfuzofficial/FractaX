import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { assetApi } from '@/api/asset.api';
import { marketplaceApi } from '@/api/marketplace.api';
import { transactionApi } from '@/api/transaction.api';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/api/user.api';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, BarChart3, Users, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import { secondaryApi } from '@/api/secondary.api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';

const RevaluationForm = ({ assetId, currentValuation }: { assetId: string; currentValuation: number }) => {
  const [open, setOpen] = useState(false);
  const [proposed, setProposed] = useState('');
  const [note, setNote] = useState('');
  const [refUrl, setRefUrl] = useState('');
  const queryClient = useQueryClient();


  const mutation = useMutation({
    mutationFn: () =>
      client.post(`/assets/${assetId}/revalue`, {
        proposedValuation: Number(proposed),
        proposedValuationNote: note,
        externalReferenceUrl: refUrl || undefined,
      }).then(r => r.data),
    onSuccess: () => {
      toast.success('Revaluation request submitted!');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit');
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors"
      >
        Request Revaluation
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Current Valuation: ₹{currentValuation.toLocaleString()}</label>
        <input
          type="number"
          placeholder="Proposed new valuation (₹)"
          value={proposed}
          onChange={e => setProposed(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <input
        type="url"
        placeholder="Market reference URL (StockX, Chrono24, etc.)"
        value={refUrl}
        onChange={e => setRefUrl(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <textarea
        placeholder="Explain why the valuation should change (min 10 chars)"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !proposed || !note}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const AssetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [shareType, setShareType] = useState<'BASIC' | 'PREMIUM'>('BASIC');
  const [quantity, setQuantity] = useState(1);
  const [txId, setTxId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const [confirmPrimaryBuy, setConfirmPrimaryBuy] = useState(false);
  const [confirmSecondaryBuy, setConfirmSecondaryBuy] = useState<{
    listingId: string;
    quantity: number;
    pricePerShare: number;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetApi.getById(id!),
    enabled: !!id,
  });

  const asset = data?.data || data;
  const basePricePerShare = asset ? Number(asset.totalValuation) / asset.totalShares : 0;
  const premiumPricePerShare = asset?.premiumSharePrice
    ? Number(asset.premiumSharePrice)
    : basePricePerShare;
  const pricePerShare = shareType === 'PREMIUM' ? premiumPricePerShare : basePricePerShare;
  const currentPrice = asset?.lastTradedPrice
    ? Number(asset.lastTradedPrice)
    : pricePerShare;
  const priceChange = asset?.lastTradedPrice
    ? ((currentPrice - pricePerShare) / pricePerShare) * 100
    : 0;
  const priceHistory = (asset?.priceHistory as any[]) || [];
  const isPublisher = user?.id === asset?.publisherId;
  const totalCost = pricePerShare * quantity;

  const buyMutation = useMutation({
    mutationFn: () => marketplaceApi.buy({ assetId: id!, shareType, quantity }),
    onSuccess: async (res) => {
      const transaction = res.data?.transaction || res.data;
      setTxId(transaction.id);
      toast.success('Purchase initiated! Blockchain confirmation processing...');
      // Refresh user balance
      try {
        const me = await userApi.getMe();
        setUser(me.data || me);
      } catch { }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Purchase failed');
    },
  });

  const { data: secondaryData } = useQuery({
    queryKey: ['secondary-listings', id],
    queryFn: () => secondaryApi.getAssetListings(id!), //---------------------secondary market listings for this asset
    enabled: !!id,
  });

  const secondaryListings = secondaryData?.data || [];

  const buySecondaryMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => secondaryApi.buyFromListing(id, quantity),  //---------------------buy from secondary market
    onSuccess: async () => {
      toast.success('Shares purchased from secondary market!');
      refetch();
      try {
        const me = await userApi.getMe();
        setUser(me.data || me);
      } catch { }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Purchase failed');
    },
  });

  // Poll transaction status
  const { data: txData } = useQuery({
    queryKey: ['transaction', txId],
    queryFn: () => transactionApi.getById(txId!),
    enabled: !!txId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === 'BLOCKCHAIN_CONFIRMED' || status === 'FAILED' || status === 'FAILED_BLOCKCHAIN') return false;
      return 3000;
    },
  });

  const txStatus = txData?.data?.status;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">Asset not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{asset.title}</h1>
            {asset.generatesRevenue && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
                Revenue Generating
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Listed by {asset.publisher?.fullName}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Valuation</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{Number(asset.totalValuation)?.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">IPO Price/Share</span>
            </div>
            <p className="text-xl font-bold text-muted-foreground">₹{pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Current Price</span>
            </div>
            <div>
              <p className="text-xl font-bold text-primary">
                ₹{currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              {priceChange !== 0 && (
                <p className={`text-xs font-medium ${priceChange > 0 ? 'text-success' : 'text-destructive'}`}>
                  {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}% from IPO
                </p>
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Available</span>
            </div>
            <p className="text-xl font-bold text-foreground">{asset.sharesAvailableForSale?.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">About this Asset</h2>
              <p className="text-muted-foreground leading-relaxed">{asset.description}</p>
            </div>

            {/* Price History */}
            {priceHistory.length > 0 && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">Price History</h2>
                <div className="space-y-2">
                  {priceHistory.slice(-5).reverse().map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleDateString()}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{entry.type}</span>
                      <span className="font-medium text-foreground">₹{Number(entry.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Reference */}
            {asset.externalReferenceUrl && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">Market Reference</h2>
                <a
                  href={asset.externalReferenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  View current market price →
                </a>
              </div>
            )}

            {/* Revaluation — publisher only */}
            {isPublisher && asset.status === 'LIVE' && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Request Revaluation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Submit a new valuation with market evidence. Admin will review and approve.
                </p>
                {asset.valuationStatus === 'PENDING_REVALUATION' ? (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                    A revaluation request is pending admin review.
                  </div>
                ) : (
                  <RevaluationForm assetId={asset.id} currentValuation={Number(asset.totalValuation)} />
                )}
              </div>
            )}

            {/* Secondary Market Listings */}
            {secondaryListings.length > 0 && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Available on Secondary Market</h2>
                <div className="space-y-3">
                  {secondaryListings.map((listing: any) => (
                    <div key={listing.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {listing.quantity} × {listing.shareType} shares
                        </p>
                        <p className="text-xs text-muted-foreground">by {listing.seller?.fullName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">
                            ₹{Number(listing.pricePerShare).toFixed(2)}/share
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total: ₹{(Number(listing.pricePerShare) * listing.quantity).toFixed(2)}
                          </p>
                        </div>
                        {user && user.id !== listing.sellerId && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={listing.quantity}
                              defaultValue={listing.quantity}
                              id={`qty-${listing.id}`}
                              className="w-16 px-2 py-1 rounded-lg bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`qty-${listing.id}`) as HTMLInputElement;
                                const qty = Math.min(listing.quantity, Math.max(1, Number(input?.value ?? listing.quantity)));
                                setConfirmSecondaryBuy({ listingId: listing.id, quantity: qty, pricePerShare: Number(listing.pricePerShare) });
                              }}
                              disabled={buySecondaryMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                            >
                              Buy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {asset.generatesRevenue && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">Revenue Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Revenue Type</p>
                    <p className="font-medium text-foreground">{asset.revenueType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Est. Annual Revenue</p>
                    <p className="font-medium text-foreground">₹{asset.estimatedAnnualRevenue?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Distribution Mode</p>
                    <p className="font-medium text-foreground">{asset.distributionMode?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Buy panel */}
          <div className="glass rounded-xl p-6 h-fit sticky top-24">
            <h2 className="text-lg font-semibold text-foreground mb-4">Buy Shares</h2>

            {user && user.kycStatus !== 'APPROVED' && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>KYC approval required to purchase shares</span>
              </div>
            )}

            {txId && txStatus && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 mb-4 ${txStatus === 'BLOCKCHAIN_CONFIRMED'
                ? 'bg-success/10 border border-success/20 text-success'
                : txStatus?.includes('FAIL')
                  ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                  : 'bg-warning/10 border border-warning/20 text-warning'
                }`}>
                {txStatus === 'BLOCKCHAIN_CONFIRMED' ? (
                  <div className="flex items-center gap-2 w-full">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Blockchain confirmed!</span>
                    {txData?.data?.blockchainTxHash && (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${txData.data.blockchainTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-xs underline"
                      >
                        View on chain →
                      </a>
                    )}
                  </div>
                ) : txStatus?.includes('FAIL') ? (
                  <><AlertTriangle className="h-4 w-4 shrink-0" /><span>Transaction failed</span></>
                ) : (
                  <><Clock className="h-4 w-4 shrink-0 animate-spin" /><span>Pending blockchain confirmation...</span></>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Share Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShareType('BASIC')}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${shareType === 'BASIC'
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => setShareType('PREMIUM')}
                    disabled={!asset.generatesRevenue}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${shareType === 'PREMIUM'
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                  >
                    Premium
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {shareType === 'PREMIUM' ? 'Capital gains + revenue share' : 'Capital gains only'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={asset.sharesAvailableForSale}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Price per share</span>
                  <div className="text-right">
                    <span className="text-foreground">₹{pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    {asset.premiumSharePrice && shareType === 'BASIC' && (
                      <p className="text-xs text-muted-foreground">Premium: ₹{Number(asset.premiumSharePrice).toFixed(2)}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="text-foreground">×{quantity}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-primary text-lg">₹{totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setConfirmPrimaryBuy(true);
                }}
                disabled={buyMutation.isPending || (!!user && user.kycStatus !== 'APPROVED')}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {buyMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Buy Shares'
                )}
              </button>
            </div>
          </div>
        </div>
      </div >
      <ConfirmModal
        isOpen={confirmPrimaryBuy}
        title="Confirm Purchase"
        message={`Buy ${quantity} ${shareType} share${quantity > 1 ? 's' : ''} of "${asset.title}" for ₹${(currentPrice * quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}?`}
        confirmLabel="Buy Shares"
        onConfirm={() => {
          setConfirmPrimaryBuy(false);
          buyMutation.mutate();
        }}
        onCancel={() => setConfirmPrimaryBuy(false)}
      />

      <ConfirmModal
        isOpen={!!confirmSecondaryBuy}
        title="Confirm Purchase"
        message={`Buy ${confirmSecondaryBuy?.quantity} share${(confirmSecondaryBuy?.quantity ?? 0) > 1 ? 's' : ''} at ₹${confirmSecondaryBuy?.pricePerShare}/share (total ₹${((confirmSecondaryBuy?.pricePerShare ?? 0) * (confirmSecondaryBuy?.quantity ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })})?`}
        confirmLabel="Buy Shares"
        onConfirm={() => {
          buySecondaryMutation.mutate({ id: confirmSecondaryBuy!.listingId, quantity: confirmSecondaryBuy!.quantity });
          setConfirmSecondaryBuy(null);
        }}
        onCancel={() => setConfirmSecondaryBuy(null)}
      />
    </AppLayout >
  );
};

export default AssetDetailPage;
