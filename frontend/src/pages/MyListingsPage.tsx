import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { secondaryApi } from '@/api/secondary.api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Tag } from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'bg-success/10 text-success', label: 'Active' },
  SOLD: { color: 'bg-primary/10 text-primary', label: 'Sold' },
  CANCELLED: { color: 'bg-muted text-muted-foreground', label: 'Cancelled' },
};

const MyListingsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SOLD' | 'CANCELLED'>('ALL');
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => secondaryApi.getMyListings(),
    enabled: !!user,
  });

  const allListings = data?.data || data || [];
  const listings = filter === 'ALL'
    ? allListings
    : allListings.filter((l: any) => l.status === filter);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => secondaryApi.cancelListing(id),
    onSuccess: () => {
      toast.success('Listing cancelled');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerships'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    },
  });

  const activeCount = allListings.filter((l: any) => l.status === 'ACTIVE').length;
  const soldCount = allListings.filter((l: any) => l.status === 'SOLD').length;
  const totalEarned = allListings
    .filter((l: any) => l.status === 'SOLD')
    .reduce((sum: number, l: any) => sum + Number(l.pricePerShare) * l.quantity, 0);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Listings</h1>
            <p className="text-muted-foreground">Shares you've listed for resale</p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Active Listings</p>
            <p className="text-2xl font-bold text-success">{activeCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Shares Sold</p>
            <p className="text-2xl font-bold text-primary">{soldCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-foreground">
              ₹{totalEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['ALL', 'ACTIVE', 'SOLD', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {f === 'ALL' ? `All (${allListings.length})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${allListings.filter((l: any) => l.status === f).length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No listings found</p>
            <p className="text-muted-foreground mb-4">
              {filter === 'ALL'
                ? "You haven't listed any shares for sale yet"
                : `No ${filter.toLowerCase()} listings`}
            </p>
            <Link to="/dashboard" className="text-primary hover:underline text-sm">
              Go to Dashboard to sell shares →
            </Link>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Price/Share</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing: any) => {
                    const status = STATUS_CONFIG[listing.status] || STATUS_CONFIG.CANCELLED;
                    return (
                      <tr
                        key={listing.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/assets/${listing.asset?.id}`)}
                      >
                        <td className="p-4 font-medium text-foreground">
                          {listing.asset?.title || 'Unknown'}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            listing.shareType === 'PREMIUM'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {listing.shareType}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-foreground">
                          {listing.quantity}
                        </td>
                        <td className="p-4 text-right font-mono text-foreground">
                          ₹{Number(listing.pricePerShare).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-mono font-medium text-primary">
                          ₹{(Number(listing.pricePerShare) * listing.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-right text-xs text-muted-foreground">
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {listing.status === 'ACTIVE' && (
                            <button
                              onClick={() => setConfirmCancel(listing.id)}
                              disabled={cancelMutation.isPending}
                              className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                          {listing.status === 'SOLD' && (
                            <span className="text-xs text-muted-foreground">
                              Sold {listing.soldAt ? new Date(listing.soldAt).toLocaleDateString() : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmCancel}
        title="Cancel Listing"
        message="Are you sure you want to cancel this listing? Your shares will be returned to your holdings."
        confirmLabel="Cancel Listing"
        cancelLabel="Keep Listing"
        variant="destructive"
        onConfirm={() => {
          cancelMutation.mutate(confirmCancel!);
          setConfirmCancel(null);
        }}
        onCancel={() => setConfirmCancel(null)}
      />
    </AppLayout>
  );
};

export default MyListingsPage;