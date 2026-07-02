import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/api/profile.api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import client from '@/api/client';
// 1. IMPORT YOUR DYNAMIC SCRIPT INJECTOR HELPER
import { loadRazorpayScript } from '@/utils/razorpayLoader';
import {
  User, Shield, CreditCard, Wallet, BarChart3,
  FileCheck, Edit2, Check, X, Plus, Trash2, Star, Loader2
} from 'lucide-react';

const PROFESSIONS = [
  'Salaried — Government',
  'Salaried — Private Sector',
  'Self Employed / Business Owner',
  'Professional (Doctor, Lawyer, CA, etc.)',
  'Freelancer',
  'Homemaker',
  'Student',
  'Retired',
  'Other',
];

const EDUCATIONS = [
  'Below 10th',
  '10th Pass',
  '12th Pass',
  'Diploma',
  'Graduate',
  'Post Graduate',
  'Doctorate',
  'Other',
];

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'kyc', label: 'KYC', icon: FileCheck },
  { id: 'wallet', label: 'Wallet & Blockchain', icon: Wallet },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
];

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('personal');
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<'BANK' | 'UPI'>('BANK');

  // NEW WALLET TOP UP FORM STATES
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isNoMethodModalOpen, setIsNoMethodModalOpen] = useState(false);

  // Personal form state
  const [personalForm, setPersonalForm] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    profession: '',
    education: '',
  });

  // Email form state
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branch: '',
    upiId: '',
  });

  // Wallet form
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletForm, setShowWalletForm] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
    onSuccess: (data: any) => {
      setPersonalForm({
        fullName: data.fullName || '',
        phone: data.phone || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || '',
        profession: data.profession || '',
        education: data.education || '',
      });
    },
  });

  const PaymentMethodSelectionModal = ({ isOpen, onClose, methods, onSelect }: any) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl p-6 shadow-2xl w-full max-w-sm border border-white/10">
          <h2 className="text-lg font-bold text-foreground mb-4">Select Withdrawal Account</h2>

          <div className="space-y-3">
            {methods.map((method: any) => (
              <button
                key={method.id}
                onClick={() => onSelect(method)}
                className="w-full p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase">
                    {method.type}
                  </span>
                </div>
                <div className="font-medium text-foreground truncate">
                  {method.type === 'UPI' ? method.upiId : method.accountNumber}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {method.bankName || "Linked Account"}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // NEW CORE RAZORPAY FRONTEND METHOD FUNCTION PIPELINE
  const handleWalletTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(topUpAmount);

    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid fund amount.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Step A: Fire a request to the newly configured route inside transaction.routes.ts
      const response = await client.post('http://localhost:5000/api/transaction/initiate-add-funds', {
        amount: numericAmount
      }, { withCredentials: true }); // Includes session auth tokens if needed

      const { bypassed, message, orderData } = response.data;

      // Step B: Evaluate Backend Bypass Switch Toggle Environment Flag
      if (bypassed) {
        setIsProcessingPayment(false);
        setTopUpAmount('');
        toast.success(message || 'Bypass Success: Balance updated locally!');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        return;
      }

      // Step C: Initialize dynamic network loading script fetch engine from Razorpay
      const isScriptReady = await loadRazorpayScript();
      if (!isScriptReady) {
        setIsProcessingPayment(false);
        toast.error('Failed to establish link connectivity with Razorpay secure endpoints.');
        return;
      }

      // Step D: Map parameters cleanly to invoke the pop up dashboard overlay layout frame
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount, // Balance amount computed cleanly in Paise units from backend
        currency: orderData.currency,
        name: "FractaX Sandbox Exchange",
        description: "Wallet Demo Capitalization Protocol",
        order_id: orderData.id, // Linked execution order reference token instance identifier
        handler: async function (response: any) {
          try {
            // UPDATED: Added full URL path to match your Step A configuration
            await client.post('/transaction/verify-and-credit', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: orderData.amount / 100
            });

            toast.success("🎉 Wallet funded successfully!");
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setTopUpAmount('');
          } catch (error) {
            console.error("Verification error:", error); // Added console log to see server errors
            toast.error("Payment verified failed on server side.");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: profile?.fullName || "Arjun Mehta",
          email: profile?.email || "arjun@demo.com",
          contact: "9999999999"
        },
        theme: {
          color: "#059669" // Slick deep teal tone aesthetic palette match configuration
        },

        config: {
          display: {
            blocks: {
              banks: {
                name: 'All Payment Options',
                instruments: [
                  {
                    method: 'upi'
                  },
                  {
                    method: 'card'
                  },
                  {
                    method: 'netbanking'
                  }
                ]
              }
            },
            sequence: ['block.banks'],
            preferences: {
              show_default_blocks: true
            }
          }
        },

        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            toast.info('Transaction simulation dismissed.');
          }
        }
      };

      const checkoutInstance = new (window as any).Razorpay(options);
      checkoutInstance.open();

    } catch (error: any) {
      setIsProcessingPayment(false);
      console.error('Wallet addition crash logs:', error);
      toast.error(error.response?.data?.message || 'Unable to complete sandbox transaction request.');
    }
  };

  // 1. First step: Validate and open the modal
  const handleWithdrawTrigger = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    // Check if methods exist
    if (!profile?.paymentMethods || profile.paymentMethods.length === 0) {
      // Open the new "No Method" modal instead of just showing a toast
      setIsNoMethodModalOpen(true);
      return;
    }

    setIsSelectionModalOpen(true);
  };

  const NoPaymentMethodModal = ({ isOpen, onClose, onNavigate }: any) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl p-6 shadow-2xl w-full max-w-sm border border-white/10 text-center">
          <h2 className="text-lg font-bold text-foreground mb-2">No Payment Method</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You haven't added a bank account or UPI ID yet. Please add one to continue your withdrawal.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                onNavigate();
                onClose();
              }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              Add Payment Method
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleMethodSelected = (method: any) => {
    setSelectedMethod(method);      // Save the one they clicked
    setIsSelectionModalOpen(false); // Close selection
    setIsConfirmModalOpen(true);    // Open the final confirmation
  };

  // 2. Second step: Confirmed action (The actual API call)
  const handleConfirmWithdraw = async () => {
    setIsConfirmModalOpen(false);
    setIsWithdrawing(true);

    try {
      // We send the ID of the method we stored in setSelectedMethod
      await client.post('/transaction/withdraw', {
        amount: parseFloat(withdrawAmount),
        paymentMethodId: selectedMethod.id
      });

      toast.success("Withdrawal request submitted!");
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setWithdrawAmount('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const updatePersonalMutation = useMutation({
    mutationFn: () => profileApi.updatePersonal(personalForm),
    onSuccess: () => {
      toast.success('Profile updated');
      setEditingPersonal(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (personalForm.fullName) {
        setUser({ ...user!, fullName: personalForm.fullName });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const updateEmailMutation = useMutation({
    mutationFn: () => profileApi.updateEmail(emailForm),
    onSuccess: () => {
      toast.success('Email updated');
      setShowEmailForm(false);
      setEmailForm({ email: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update email'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => profileApi.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      passwordForm.currentPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const updateAvatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.updateAvatar(file),
    onSuccess: () => {
      toast.success('Avatar updated');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error('Failed to update avatar'),
  });

  const updateWalletMutation = useMutation({
    mutationFn: () => profileApi.updateWalletAddress(walletAddress),
    onSuccess: () => {
      toast.success('Wallet address updated');
      setShowWalletForm(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Invalid address'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: () => profileApi.addPaymentMethod({
      type: paymentType,
      ...paymentForm,
    }),
    onSuccess: () => {
      toast.success('Payment method added');
      setShowAddPayment(false);
      setPaymentForm({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', branch: '', upiId: '' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add'),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => profileApi.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success('Payment method removed');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error('Failed to remove'),
  });

  const [confirmLogout, setConfirmLogout] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { }
    useAuthStore.getState().logout();
    navigate('/login');
  };

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => profileApi.setDefaultPaymentMethod(id),
    onSuccess: () => {
      toast.success('Default payment method updated');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  const initials = profile?.fullName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">

        {/* Profile Header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                  {initials}
                </div>
              )}
              <label className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90">
                <Edit2 className="h-3 w-3 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) updateAvatarMutation.mutate(file);
                  }}
                />
              </label>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{profile?.fullName}</h1>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {profile?.role}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${profile?.kycStatus === 'APPROVED'
                  ? 'bg-success/10 text-success'
                  : profile?.kycStatus === 'REJECTED'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                  }`}>
                  KYC {profile?.kycStatus}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(profile?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Personal Info ── */}
        {tab === 'personal' && (
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
              {!editingPersonal ? (
                <button
                  onClick={() => {
                    setPersonalForm({
                      fullName: profile?.fullName || '',
                      phone: profile?.phone || '',
                      dateOfBirth: profile?.dateOfBirth || '',
                      gender: profile?.gender || '',
                      profession: profile?.profession || '',
                      education: profile?.education || '',
                    });
                    setEditingPersonal(true);
                  }}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Edit2 className="h-4 w-4" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => updatePersonalMutation.mutate()}
                    disabled={updatePersonalMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm"
                  >
                    <Check className="h-4 w-4" /> Save
                  </button>
                  <button
                    onClick={() => setEditingPersonal(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-sm"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', key: 'fullName', type: 'text' },
                { label: 'Phone Number', key: 'phone', type: 'tel' },
                { label: 'Date of Birth', key: 'dateOfBirth', type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                  {editingPersonal ? (
                    <input
                      type={type}
                      value={(personalForm as any)[key]}
                      onChange={(e) => setPersonalForm({ ...personalForm, [key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {(profile as any)?.[key] || <span className="text-muted-foreground">Not set</span>}
                    </p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Gender</label>
                {editingPersonal ? (
                  <select
                    value={personalForm.gender}
                    onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {profile?.gender?.replace('_', ' ') || <span className="text-muted-foreground">Not set</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Profession</label>
                {editingPersonal ? (
                  <select
                    value={personalForm.profession}
                    onChange={(e) => setPersonalForm({ ...personalForm, profession: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select</option>
                    {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {profile?.profession || <span className="text-muted-foreground">Not set</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Education</label>
                {editingPersonal ? (
                  <select
                    value={personalForm.education}
                    onChange={(e) => setPersonalForm({ ...personalForm, education: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select</option>
                    {EDUCATIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {profile?.education || <span className="text-muted-foreground">Not set</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Email section */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                  <p className="text-sm font-medium text-foreground">{profile?.email}</p>
                </div>
                <button
                  onClick={() => setShowEmailForm(!showEmailForm)}
                  className="text-sm text-primary hover:underline"
                >
                  Change Email
                </button>
              </div>
              {showEmailForm && (
                <div className="space-y-3 p-4 rounded-lg bg-secondary/50">
                  <input
                    type="email"
                    placeholder="New email address"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="password"
                    placeholder="Current password to confirm"
                    value={emailForm.password}
                    onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateEmailMutation.mutate()}
                      disabled={updateEmailMutation.isPending}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      Update Email
                    </button>
                    <button
                      onClick={() => setShowEmailForm(false)}
                      className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Security ── */}
        {tab === 'security' && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Change Password</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">Passwords do not match</p>
                )}
              </div>
              <button
                onClick={() => changePasswordMutation.mutate()}
                disabled={
                  changePasswordMutation.isPending ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  passwordForm.newPassword !== passwordForm.confirmPassword
                }
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}

        {/* ── KYC ── */}
        {tab === 'kyc' && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">KYC Verification</h2>
            {profile?.kyc ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${profile.kyc.status === 'APPROVED' ? 'bg-success/10 text-success' :
                      profile.kyc.status === 'REJECTED' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/10 text-warning'
                      }`}>
                      {profile.kyc.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Document Type</p>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {profile.kyc.documentType?.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(profile.kyc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {profile.kyc.reviewedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reviewed</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(profile.kyc.reviewedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {profile.kyc.adminNote && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <p className="font-medium mb-1">Rejection reason:</p>
                    <p>{profile.kyc.adminNote}</p>
                  </div>
                )}

                {profile.kyc.cloudinaryUrl && (
                  <a
                    href={profile.kyc.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View submitted document →
                  </a>
                )}

                {profile.kyc.status === 'REJECTED' && (
                  <a
                    href="/kyc"
                    className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    Resubmit KYC
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No KYC submission found</p>
                <a
                  href="/kyc"
                  className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Submit KYC
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Wallet ── */}
        {tab === 'wallet' && (
          <div className="glass rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Wallet & Blockchain</h2>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Platform Wallet Balance</p>
              <p className="text-3xl font-bold text-primary">
                ₹{Number(profile?.walletBalance ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Demo balance — not real money</p>
            </div>

            {/* ========================================================
                ADDED WALLET DEPOSIT CARD FORM DIRECTLY IN THIS SLOT
               ======================================================== */}
            {/* This is the container that gives the Deposit section its look */}
            <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Add Capital to Wallet</h3>
                <p className="text-xs text-muted-foreground">Instantly buy demo currency credits securely via Razorpay Sandbox.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="number"
                  placeholder="Amount (e.g. 5000)"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleWalletTopUpSubmit}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 whitespace-nowrap"
                >
                  Deposit Funds
                </button>
              </div>
            </div>

            {/* USE THIS EXACT STRUCTURE FOR WITHDRAW */}
            <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3 mt-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Withdraw Funds</h3>
                <p className="text-xs text-muted-foreground">Request a payout to your default payment method.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="number"
                  placeholder="Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={isWithdrawing}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleWithdrawTrigger}
                  disabled={isWithdrawing}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                >
                  {isWithdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
                </button>
              </div>
            </div>


            {/* Selection Modal */}
            <PaymentMethodSelectionModal
              isOpen={isSelectionModalOpen}
              onClose={() => setIsSelectionModalOpen(false)}
              methods={profile?.paymentMethods || []}
              onSelect={handleMethodSelected}
            />


            <NoPaymentMethodModal
              isOpen={isNoMethodModalOpen}
              onClose={() => setIsNoMethodModalOpen(false)}
              onNavigate={() => setTab('payments')} // This automatically switches the tab to 'Payment Methods'
            />
            
            <ConfirmModal
              isOpen={isConfirmModalOpen}
              title="Confirm Withdrawal"
              message={`Are you sure you want to withdraw ₹${withdrawAmount} to your registered bank account?`}
              confirmLabel="Confirm Transfer"
              cancelLabel="Cancel"
              onCancel={() => setIsConfirmModalOpen(false)}
              onConfirm={handleConfirmWithdraw}
            />

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">MetaMask Wallet Address</p>
                  <p className="text-xs text-muted-foreground">Used for blockchain proof of ownership</p>
                </div>
                <button
                  onClick={() => setShowWalletForm(!showWalletForm)}
                  className="text-sm text-primary hover:underline"
                >
                  {profile?.walletAddress ? 'Update' : 'Connect'}
                </button>
              </div>

              {profile?.walletAddress ? (
                <div className="p-3 rounded-lg bg-secondary/50 font-mono text-sm text-foreground break-all">
                  {profile.walletAddress}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                  No wallet connected
                </div>
              )}

              {showWalletForm && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateWalletMutation.mutate()}
                      disabled={updateWalletMutation.isPending}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      Save Address
                    </button>
                    <button
                      onClick={() => setShowWalletForm(false)}
                      className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Payment Methods ── */}
        {tab === 'payments' && (
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Payment Methods</h2>
                <p className="text-xs text-muted-foreground">For withdrawal purposes — no real transactions in MVP</p>
              </div>
              <button
                onClick={() => setShowAddPayment(!showAddPayment)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Method
              </button>
            </div>

            {/* Add payment form */}
            {showAddPayment && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentType('BANK')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${paymentType === 'BANK'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border'
                      }`}
                  >
                    Bank Account
                  </button>
                  <button
                    onClick={() => setPaymentType('UPI')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${paymentType === 'UPI'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border'
                      }`}
                  >
                    UPI
                  </button>
                </div>

                {paymentType === 'BANK' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'accountHolderName', label: 'Account Holder Name' },
                      { key: 'accountNumber', label: 'Account Number' },
                      { key: 'ifscCode', label: 'IFSC Code' },
                      { key: 'bankName', label: 'Bank Name' },
                      { key: 'branch', label: 'Branch (optional)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                        <input
                          type="text"
                          value={(paymentForm as any)[key]}
                          onChange={(e) => setPaymentForm({ ...paymentForm, [key]: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">UPI ID</label>
                    <input
                      type="text"
                      placeholder="yourname@upi"
                      value={paymentForm.upiId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, upiId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => addPaymentMutation.mutate()}
                    disabled={addPaymentMutation.isPending}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {addPaymentMutation.isPending ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => setShowAddPayment(false)}
                    className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Payment methods list */}
            {!profile?.paymentMethods?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No payment methods added yet
              </div>
            ) : (
              <div className="space-y-3">
                {profile.paymentMethods.map((method: any) => (
                  <div key={method.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {method.type}
                        </span>
                        {method.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium flex items-center gap-1">
                            <Star className="h-3 w-3" /> Default
                          </span>
                        )}
                      </div>
                      {method.type === 'BANK' ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">{method.bankName}</p>
                          <p className="text-xs text-muted-foreground">
                            {method.accountHolderName} · ****{method.accountNumber?.slice(-4)} · {method.ifscCode}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-foreground">{method.upiId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => setDefaultMutation.mutate(method.id)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletePaymentId(method.id)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Statistics ── */}
        {tab === 'stats' && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Account Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Assets Published', value: profile?._count?.assets ?? 0, color: 'text-primary' },
                { label: 'Shares Owned', value: profile?._count?.ownerships ?? 0, color: 'text-success' },
                { label: 'Total Transactions', value: profile?._count?.buyTxns ?? 0, color: 'text-accent' },
                {
                  label: 'Earned from Resales',
                  value: `₹${Number(profile?.totalEarned ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  color: 'text-warning'
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card text-center">
                  <p className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a
                href="/dashboard"
                className="text-sm text-primary hover:underline"
              >
                View full transaction history →
              </a>
            </div>
          </div>
        )}
        {/* Logout */}
        <div className="glass rounded-2xl p-6 border border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sign Out</h2>
              <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
            </div>
            <button
              onClick={() => setConfirmLogout(true)}
              className="px-6 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium transition-colors border border-destructive/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="destructive"
        onConfirm={() => {
          setConfirmLogout(false);
          handleLogout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      <ConfirmModal
        isOpen={!!deletePaymentId}
        title="Remove Payment Method"
        message="Are you sure you want to remove this payment method?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          deletePaymentMutation.mutate(deletePaymentId!);
          setDeletePaymentId(null);
        }}
        onCancel={() => setDeletePaymentId(null)}
      />
    </AppLayout >
  );
};

export default ProfilePage;