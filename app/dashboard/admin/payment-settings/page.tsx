'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  CreditCard,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  Webhook,
  Key,
  Settings,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function AdminPaymentSettingsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [merchantKey, setMerchantKey] = useState('');
  const [merchantSalt, setMerchantSalt] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testMode, setTestMode] = useState(true);

  const [showKey, setShowKey] = useState(false);
  const [showSalt, setShowSalt] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Prevent settings from being fetched repeatedly
  // and overwriting what the admin is currently typing.
  const settingsLoaded = useRef(false);

  // --------------------------------------------------
  // ADMIN AUTH CHECK
  // --------------------------------------------------
  useEffect(() => {
    if (loading) return;

    if (!user || profile?.role !== 'admin') {
      router.replace('/login');
    }
  }, [loading, user, profile?.role, router]);

  // --------------------------------------------------
  // FETCH PAYMENT SETTINGS
  // --------------------------------------------------
  const fetchSettings = useCallback(async () => {
    try {
      setDataLoading(true);

      const { data, error } = await supabase.rpc(
        'admin_get_payment_settings'
      );

      if (error) {
        console.error('Payment settings fetch error:', error);

        toast.error('Could not load payment settings.');
        return;
      }

      console.log('Payment settings loaded:', data);

      if (data) {
        setMerchantKey(data.merchant_key ?? '');
        setMerchantSalt(data.merchant_salt ?? '');
        setWebhookSecret(data.webhook_secret ?? '');
        setTestMode(data.test_mode ?? true);
      }
    } catch (error) {
      console.error('Unexpected payment settings error:', error);

      toast.error('Could not load payment settings.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD SETTINGS ONLY ONCE
  // --------------------------------------------------
  useEffect(() => {
    if (
      !loading &&
      profile?.role === 'admin' &&
      !settingsLoaded.current
    ) {
      settingsLoaded.current = true;
      fetchSettings();
    }
  }, [loading, profile?.role, fetchSettings]);

  // --------------------------------------------------
  // SAVE PAYMENT SETTINGS
  // --------------------------------------------------
  const handleSave = async () => {
    const cleanMerchantKey = merchantKey.trim();
    const cleanMerchantSalt = merchantSalt.trim();
    const cleanWebhookSecret = webhookSecret.trim();

    if (!cleanMerchantKey) {
      toast.error('Merchant Key is required.');
      return;
    }

    if (!cleanMerchantSalt) {
      toast.error('Merchant Salt is required.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc(
        'admin_update_payment_settings',
        {
          p_merchant_key: cleanMerchantKey,
          p_merchant_salt: cleanMerchantSalt,
          p_webhook_secret: cleanWebhookSecret,
          p_test_mode: testMode,
        }
      );

      if (error) {
        console.error('Payment settings save error:', error);

        toast.error(
          error.message || 'Could not save payment settings.'
        );

        return;
      }

      toast.success('Payment settings saved successfully!');
    } catch (error) {
      console.error('Unexpected save error:', error);

      toast.error('Something went wrong while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // WEBHOOK URL
  // --------------------------------------------------
  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/functions/v1/payu-webhook`
      : '/functions/v1/payu-webhook';

  // --------------------------------------------------
  // COPY WEBHOOK URL
  // --------------------------------------------------
  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);

      toast.success('Webhook URL copied!');
    } catch (error) {
      console.error('Clipboard error:', error);

      toast.error('Could not copy webhook URL.');
    }
  };

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------
  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------
  return (
    <DashboardShell role="admin">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Payment Settings
        </h1>

        <p className="text-sm text-slate-500">
          Configure PayU payment gateway credentials and webhook
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ================================================
            PAYMENT CREDENTIALS
        ================================================= */}

        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-sky-500" />

                PayU Credentials
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* MERCHANT KEY */}

              <div className="space-y-2">
                <Label htmlFor="merchant-key">
                  Merchant Key
                </Label>

                <div className="relative">
                  <Input
                    id="merchant-key"
                    type={showKey ? 'text' : 'password'}
                    value={merchantKey}
                    onChange={(e) =>
                      setMerchantKey(e.target.value)
                    }
                    placeholder="Enter PayU Merchant Key"
                    autoComplete="off"
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showKey
                        ? 'Hide merchant key'
                        : 'Show merchant key'
                    }
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Found in your PayU dashboard under Settings →
                  API Keys
                </p>
              </div>

              {/* MERCHANT SALT */}

              <div className="space-y-2">
                <Label htmlFor="merchant-salt">
                  Merchant Salt
                </Label>

                <div className="relative">
                  <Input
                    id="merchant-salt"
                    type={showSalt ? 'text' : 'password'}
                    value={merchantSalt}
                    onChange={(e) =>
                      setMerchantSalt(e.target.value)
                    }
                    placeholder="Enter PayU Merchant Salt"
                    autoComplete="off"
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowSalt((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showSalt
                        ? 'Hide merchant salt'
                        : 'Show merchant salt'
                    }
                  >
                    {showSalt ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Used for hash generation and payment verification
                </p>
              </div>

              {/* WEBHOOK SECRET */}

              <div className="space-y-2">
                <Label htmlFor="webhook-secret">
                  Webhook Secret (Optional)
                </Label>

                <div className="relative">
                  <Input
                    id="webhook-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={webhookSecret}
                    onChange={(e) =>
                      setWebhookSecret(e.target.value)
                    }
                    placeholder="Enter webhook secret (optional)"
                    autoComplete="off"
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowSecret((prev) => !prev)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showSecret
                        ? 'Hide webhook secret'
                        : 'Show webhook secret'
                    }
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Additional secret for webhook authentication
                  (recommended)
                </p>
              </div>

              {/* TEST MODE */}

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-500" />

                    <span className="text-sm font-semibold text-slate-900">
                      Test Mode
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Use PayU sandbox (test.payu.in) instead of
                    live gateway
                  </p>
                </div>

                <Switch
                  checked={testMode}
                  onCheckedChange={setTestMode}
                  aria-label="Toggle PayU test mode"
                />
              </div>

              {/* ENVIRONMENT BADGE */}

              <div className="flex items-center gap-2 pt-2">
                <Badge
                  variant={
                    testMode ? 'secondary' : 'default'
                  }
                >
                  {testMode
                    ? 'Test Environment'
                    : 'Live Environment'}
                </Badge>
              </div>

              {/* SAVE */}

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-sky-500 text-white hover:bg-sky-600"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}

                {saving
                  ? 'Saving...'
                  : 'Save Payment Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ================================================
            RIGHT SIDEBAR
        ================================================= */}

        <div className="space-y-6">
          {/* WEBHOOK */}

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Webhook className="h-5 w-5 text-emerald-500" />

                Webhook URL
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Configure this URL in your PayU dashboard as
                the success and failure callback URL.
              </p>

              <div className="rounded-lg bg-slate-50 p-3">
                <code className="break-all text-xs text-slate-700">
                  {webhookUrl}
                </code>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={copyWebhookUrl}
              >
                Copy URL
              </Button>
            </CardContent>
          </Card>

          {/* SECURITY */}

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-amber-500" />

                Security Notes
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" />

                <p>
                  Credentials are stored securely and never
                  exposed to the browser
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" />

                <p>
                  Payment hashes are verified server-side before
                  enrollment
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" />

                <p>
                  Students are enrolled only after successful
                  payment verification
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" />

                <p>
                  Switch off Test Mode only when ready to accept
                  live payments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PAYU DOCS */}

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-violet-500" />

                PayU Docs
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-xs text-slate-500">
                Get your API credentials from the PayU dashboard.
                Refer to the{' '}
                <a
                  href="https://docs.payu.in/docs/prebuilt-checkout-payu-hosted"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sky-600 hover:underline"
                >
                  PayU Hosted Checkout documentation
                </a>{' '}
                for setup details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}