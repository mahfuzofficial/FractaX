import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { assetApi } from '@/api/asset.api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { AlertTriangle, Upload, FileText, X } from 'lucide-react';

interface AssetForm {
  title: string;
  description: string;
  totalValuation: number;
  totalShares: number;
  sharesAvailableForSale: number;
  category: string;
  externalReferenceUrl?: string;
  generatesRevenue: boolean;
  revenueType?: 'FIXED' | 'VARIABLE';
  estimatedAnnualRevenue?: number;
  distributionMode: 'FREE_CHOICE' | 'FIXED_RATIO';
  basicSharesAllotted?: number;
  premiumSharesAllotted?: number;
  premiumSharePrice?: number;
}

const CreateAssetPage = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [document, setDocument] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<AssetForm>({
    defaultValues: { generatesRevenue: false, distributionMode: 'FREE_CHOICE', category: 'OTHER' },
  });

  const generatesRevenue = watch('generatesRevenue');
  const distributionMode = watch('distributionMode');

  // Fetch existing asset in edit mode
  const { data: existingData } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetApi.getById(id!),
    enabled: isEditMode,
  });

  const existingAsset = existingData?.data || existingData;

  // Populate form with existing data
  useEffect(() => {
    if (existingAsset) {
      reset({
        title: existingAsset.title,
        description: existingAsset.description,
        totalValuation: Number(existingAsset.totalValuation),
        totalShares: existingAsset.totalShares,
        sharesAvailableForSale: existingAsset.sharesAvailableForSale,
        category: existingAsset.category || 'OTHER',
        externalReferenceUrl: existingAsset.externalReferenceUrl || '',
        generatesRevenue: existingAsset.generatesRevenue,
        revenueType: existingAsset.revenueType,
        estimatedAnnualRevenue: existingAsset.estimatedAnnualRevenue
          ? Number(existingAsset.estimatedAnnualRevenue)
          : undefined,
        distributionMode: existingAsset.distributionMode,
        basicSharesAllotted: existingAsset.basicSharesAllotted ?? undefined,
        premiumSharesAllotted: existingAsset.premiumSharesAllotted ?? undefined,
      });
    }
  }, [existingAsset, reset]);

  const mutation = useMutation({
    mutationFn: async (data: AssetForm) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (document) formData.append('document', document);

      const token = localStorage.getItem('accessToken');
      const url = isEditMode
        ? `http://localhost:5000/api/assets/${id}`
        : 'http://localhost:5000/api/assets';
      const method = isEditMode ? 'PUT' : 'POST';

      return fetch(url, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw { response: { data: json } };
        return json;
      });
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Asset resubmitted for approval!' : 'Asset submitted for approval!');
      navigate('/dashboard');
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data?.errors?.length > 0) {
        // Show each validation error
        data.errors.forEach((e: { field: string; message: string }) => {
          toast.error(`${e.field}: ${e.message}`);
        });
      } else {
        toast.error(data?.message || 'Failed to submit asset');
      }
    },
  });

  if (user?.kycStatus !== 'APPROVED') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="glass rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">KYC Required</h2>
            <p className="text-muted-foreground mb-4">You need KYC approval before listing assets.</p>
            <a href="/kyc" className="text-primary hover:underline">Complete KYC →</a>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isEditMode ? 'Edit & Resubmit Asset' : 'List a New Asset'}
        </h1>
        <p className="text-muted-foreground mb-4">
          {isEditMode ? 'Fix the issues and resubmit for approval' : 'Tokenize a real-world asset and offer shares to investors'}
        </p>

        {/* Show rejection reason in edit mode */}
        {isEditMode && existingAsset?.adminNote && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6">
            <p className="font-medium mb-1">Rejection reason:</p>
            <p>{existingAsset.adminNote}</p>
          </div>
        )}

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
              <input
                {...register('title', { required: 'Required' })}
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="e.g. Mumbai Commercial Property"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
              <textarea
                {...register('description', { required: 'Required' })}
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                placeholder="Describe the asset..."
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Asset Category</label>
              <select
                {...register('category')}
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="OTHER">Other</option>
                <option value="REAL_ESTATE">Real Estate</option>
                <option value="LUXURY_GOODS">Luxury Goods</option>
                <option value="COLLECTIBLES">Collectibles</option>
                <option value="ART">Art</option>
                <option value="VEHICLES">Vehicles</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                External Reference URL
                <span className="text-muted-foreground font-normal ml-1">(StockX, Chrono24, MagicBricks link)</span>
              </label>
              <input
                {...register('externalReferenceUrl')}
                type="url"
                placeholder="https://stockx.com/air-jordan-1..."
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Total Valuation (₹)</label>
                <input
                  type="number"
                  {...register('totalValuation', { required: 'Required', valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Total Shares</label>
                <input
                  type="number"
                  {...register('totalShares', { required: 'Required', valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Shares Available for Sale</label>
              <input
                type="number"
                {...register('sharesAvailableForSale', { required: 'Required', valueAsNumber: true })}
                className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            {/* Document upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Ownership Document
                <span className="text-muted-foreground font-normal ml-1">
                  {isEditMode ? '(optional — replaces existing)' : '(title deed, registry, invoice)'}
                </span>
              </label>
              {isEditMode && existingAsset?.documentUrl && !document && (
                <a
                  href={existingAsset.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline block mb-2"
                >
                  View current document →
                </a>
              )}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) setDocument(file);
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                {document ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground font-medium">{document.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDocument(null); }}
                      className="p-1 rounded-full hover:bg-secondary"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drag & drop or <span className="text-primary">browse</span></p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 10MB</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setDocument(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <input
                type="checkbox"
                id="revenue"
                {...register('generatesRevenue')}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="revenue" className="text-sm font-medium text-foreground">
                This asset generates revenue
              </label>
            </div>

            {generatesRevenue && (
              <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Revenue Type</label>
                    <select
                      {...register('revenueType')}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    >
                      <option value="FIXED">Fixed</option>
                      <option value="VARIABLE">Variable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Est. Annual Revenue (₹)</label>
                    <input
                      type="number"
                      {...register('estimatedAnnualRevenue', { valueAsNumber: true })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Distribution Mode</label>
                  <select
                    {...register('distributionMode')}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="FREE_CHOICE">Free Choice</option>
                    <option value="FIXED_RATIO">Fixed Ratio</option>
                  </select>
                </div>

                {distributionMode === 'FIXED_RATIO' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Basic Shares Allotted</label>
                      <input
                        type="number"
                        {...register('basicSharesAllotted', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Premium Shares Allotted</label>
                      <input
                        type="number"
                        {...register('premiumSharesAllotted', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                )}
                {generatesRevenue && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Premium Share Price (₹)
                      <span className="text-muted-foreground font-normal ml-1">
                        (optional — leave empty to use standard price)
                      </span>
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      {...register('premiumSharePrice', { valueAsNumber: true })}
                      placeholder={`Standard price: ₹${watch('totalValuation') && watch('totalShares') ? (watch('totalValuation') / watch('totalShares')).toFixed(2) : '0.00'}`}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PREMIUM shares include revenue share — you can price them higher than BASIC shares
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {mutation.isPending
                ? (isEditMode ? 'Resubmitting...' : 'Submitting...')
                : (isEditMode ? 'Resubmit for Approval' : 'Submit for Approval')}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreateAssetPage;