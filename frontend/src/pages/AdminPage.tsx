import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import client from '@/api/client';
import { Users, FileCheck, BarChart3, Activity, CheckCircle, X, ExternalLink, TrendingUp } from 'lucide-react';

type Tab = 'stats' | 'kyc' | 'assets' | 'revaluations';

const AdminPage = () => {
  const [tab, setTab] = useState<Tab>('stats');
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ['admin-kyc'],
    queryFn: () => adminApi.getKyc(),
    enabled: tab === 'kyc',
  });

  const { data: assetData, isLoading: assetLoading } = useQuery({
    queryKey: ['admin-assets'],
    queryFn: () => adminApi.getAssets(),
    enabled: tab === 'assets',
  });

  const { data: revalData, isLoading: revalLoading } = useQuery({
    queryKey: ['admin-revaluations'],
    queryFn: () => client.get('/admin/revaluations').then(r => r.data),
    enabled: tab === 'revaluations',
  });
  
  const revalList = revalData?.data || [];
  const stats = statsData?.data || statsData || {};
  const kycList = kycData?.data || kycData || [];
  const assetList = assetData?.data || assetData || [];

  const kycApproveMutation = useMutation({
    mutationFn: (userId: string) => adminApi.approveKyc(userId),
    onSuccess: () => { toast.success('KYC approved'); queryClient.invalidateQueries({ queryKey: ['admin-kyc'] }); },
  });

  const kycRejectMutation = useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: string }) => adminApi.rejectKyc(userId, note),
    onSuccess: () => { toast.success('KYC rejected'); queryClient.invalidateQueries({ queryKey: ['admin-kyc'] }); },
  });

  const assetApproveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveAsset(id),
    onSuccess: () => { toast.success('Asset approved'); queryClient.invalidateQueries({ queryKey: ['admin-assets'] }); },
  });

  const assetRejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminApi.rejectAsset(id, note),
    onSuccess: () => { toast.success('Asset rejected'); queryClient.invalidateQueries({ queryKey: ['admin-assets'] }); },
  });

  const revalApproveMutation = useMutation({
    mutationFn: (id: string) => client.patch(`/admin/revaluations/${id}/approve`),
    onSuccess: () => { toast.success('Revaluation approved'); queryClient.invalidateQueries({ queryKey: ['admin-revaluations'] }); },
  });

  const revalRejectMutation = useMutation({
    mutationFn: (id: string) => client.patch(`/admin/revaluations/${id}/reject`),
    onSuccess: () => { toast.success('Revaluation rejected'); queryClient.invalidateQueries({ queryKey: ['admin-revaluations'] }); },
  });

  const tabs = [
    { id: 'stats' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'kyc' as Tab, label: 'KYC Review', icon: FileCheck },
    { id: 'assets' as Tab, label: 'Asset Review', icon: Activity },
    { id: 'revaluations' as Tab, label: 'Revaluations', icon: TrendingUp },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Panel</h1>

        <div className="flex gap-1 mb-8 p-1 glass rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Stats ── */}
        {tab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users, icon: Users, color: 'text-primary' },
              { label: 'Pending KYC', value: stats.pendingKyc, icon: FileCheck, color: 'text-warning' },
              { label: 'Live Assets', value: stats.liveAssets, icon: BarChart3, color: 'text-success' },
              { label: 'Transactions', value: stats.transactions, icon: Activity, color: 'text-accent' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <s.icon className="h-4 w-4" />
                  <span className="text-sm">{s.label}</span>
                </div>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── KYC Review ── */}
        {tab === 'kyc' && (
          <div className="space-y-4">
            {kycLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : !Array.isArray(kycList) || kycList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground glass rounded-xl">No KYC submissions</div>
            ) : (
              kycList.map((k: any) => (
                <div key={k.id || k.userId} className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* User info */}
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {(k.user?.fullName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{k.user?.fullName || k.userId}</p>
                          <p className="text-sm text-muted-foreground">{k.user?.email}</p>
                        </div>
                        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                          k.status === 'APPROVED' ? 'bg-success/10 text-success' :
                          k.status === 'REJECTED' ? 'bg-destructive/10 text-destructive' :
                          'bg-warning/10 text-warning'
                        }`}>{k.status}</span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-secondary/50">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Document Type</p>
                          <p className="text-sm font-medium text-foreground capitalize">{k.documentType?.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(k.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Reviewed</p>
                          <p className="text-sm font-medium text-foreground">
                            {k.reviewedAt ? new Date(k.reviewedAt).toLocaleDateString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Admin Note</p>
                          <p className="text-sm font-medium text-foreground">{k.adminNote || '—'}</p>
                        </div>
                      </div>

                      {/* Document link */}
                      {k.cloudinaryUrl && (
                        <a
                          href={k.cloudinaryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View uploaded document
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    {k.status === 'PENDING' && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => kycApproveMutation.mutate(k.userId)}
                          disabled={kycApproveMutation.isPending}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const note = prompt('Rejection reason:');
                            if (note) kycRejectMutation.mutate({ userId: k.userId, note });
                          }}
                          disabled={kycRejectMutation.isPending}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Asset Review ── */}
        {tab === 'assets' && (
          <div className="space-y-4">
            {assetLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : !Array.isArray(assetList) || assetList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground glass rounded-xl">No assets pending review</div>
            ) : (
              assetList.map((a: any) => (
                <div key={a.id} className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Title + publisher */}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{a.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          by {a.publisher?.fullName} · {a.publisher?.email}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.publisher?.kycStatus === 'APPROVED' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-warning/10 text-warning'
                          }`}>
                            KYC {a.publisher?.kycStatus}
                          </span>
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-secondary/50">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Valuation</p>
                          <p className="text-sm font-bold text-primary">₹{Number(a.totalValuation).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Shares</p>
                          <p className="text-sm font-medium text-foreground">{a.totalShares}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">For Sale</p>
                          <p className="text-sm font-medium text-foreground">{a.sharesAvailableForSale}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Price/Share</p>
                          <p className="text-sm font-medium text-foreground">
                            ₹{(Number(a.totalValuation) / a.totalShares).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Generates Revenue</p>
                          <p className="text-sm font-medium text-foreground">{a.generatesRevenue ? 'Yes' : 'No'}</p>
                        </div>
                        {a.generatesRevenue && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Revenue Type</p>
                              <p className="text-sm font-medium text-foreground">{a.revenueType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Est. Annual Revenue</p>
                              <p className="text-sm font-medium text-foreground">₹{Number(a.estimatedAnnualRevenue).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Distribution</p>
                              <p className="text-sm font-medium text-foreground">{a.distributionMode?.replace('_', ' ')}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        {a.documentUrl && (
                          <a
                            href={a.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View ownership document
                          </a>
                        )}
                        {a.externalReferenceUrl && (
                          <a
                            href={a.externalReferenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View market reference (publisher provided)
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => assetApproveMutation.mutate(a.id)}
                        disabled={assetApproveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt('Rejection reason:');
                          if (note) assetRejectMutation.mutate({ id: a.id, note });
                        }}
                        disabled={assetRejectMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'revaluations' && (
          <div className="space-y-4">
            {revalLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : !Array.isArray(revalList) || revalList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground glass rounded-xl">No pending revaluations</div>
            ) : (
              revalList.map((a: any) => (
                <div key={a.id} className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">by {a.publisher?.fullName} · {a.publisher?.email}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-lg bg-secondary/50">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current Valuation</p>
                          <p className="text-sm font-bold text-foreground">₹{Number(a.totalValuation).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Proposed Valuation</p>
                          <p className="text-sm font-bold text-primary">₹{Number(a.proposedValuation).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Change</p>
                          <p className={`text-sm font-bold ${Number(a.proposedValuation) > Number(a.totalValuation) ? 'text-success' : 'text-destructive'}`}>
                            {((Number(a.proposedValuation) - Number(a.totalValuation)) / Number(a.totalValuation) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Publisher's note</p>
                        <p className="text-sm text-foreground">{a.proposedValuationNote}</p>
                      </div>
                      {a.externalReferenceUrl && (
                        <a href={a.externalReferenceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          View market reference
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => revalApproveMutation.mutate(a.id)}
                        disabled={revalApproveMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => revalRejectMutation.mutate(a.id)}
                        disabled={revalRejectMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminPage;
