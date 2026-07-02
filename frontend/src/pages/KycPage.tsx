import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kycApi } from '@/api/kyc.api';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/api/user.api';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { Upload, FileCheck, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const KycPage = () => {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('passport');
  const [dragOver, setDragOver] = useState(false);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => kycApi.getStatus(),
  });

  const kycStatus = statusData?.data || statusData;

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('document', file!);
      formData.append('documentType', docType);
      return kycApi.submit(formData);
    },
    onSuccess: async () => {
      toast.success('KYC submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
      try {
        const me = await userApi.getMe();
        setUser(me.data || me);
      } catch {}
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Submission failed');
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const submitted = kycStatus?.status;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-2">KYC Verification</h1>
        <p className="text-muted-foreground mb-8">Verify your identity to start trading</p>

        {submitted && (
          <div className={`glass rounded-xl p-6 mb-6 ${
            submitted === 'APPROVED' ? 'border-success/30' : submitted === 'REJECTED' ? 'border-destructive/30' : 'border-warning/30'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {submitted === 'APPROVED' ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : submitted === 'REJECTED' ? (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              ) : (
                <Clock className="h-6 w-6 text-warning" />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {submitted === 'APPROVED' ? 'Verified' : submitted === 'REJECTED' ? 'Rejected' : 'Under Review'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {submitted === 'APPROVED'
                    ? 'Your identity has been verified'
                    : submitted === 'REJECTED'
                    ? kycStatus.adminNote || 'Your submission was rejected'
                    : 'We are reviewing your documents'}
                </p>
              </div>
            </div>
            {kycStatus.documentType && (
              <p className="text-xs text-muted-foreground">Document: {kycStatus.documentType}</p>
            )}
          </div>
        )}

        {(!submitted || submitted === 'REJECTED') && (
          <div className="glass rounded-2xl p-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="passport">Passport</option>
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="driving_license">Driving License</option>
                  <option value="voter_id">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Upload Document</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('kyc-file')?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <input
                    id="kyc-file"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileCheck className="h-5 w-5 text-success" />
                      <span className="text-foreground font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF or image, max 5MB</p>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={!file || mutation.isPending}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {mutation.isPending ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default KycPage;
