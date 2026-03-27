import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { useUserStore, isOwner } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import {
  Database, CreditCard, Eye, EyeOff, Save, ShieldCheck,
  ChevronDown, CheckCircle2, Lock, Zap,
} from "lucide-react";
import { useEffect } from "react";

const SECTION_FADE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

type DbProvider = "postgresql" | "supabase" | "mongodb" | "firebase";
type PayProvider = "stripe" | "amarpay" | "lemonsqueezy" | "paypal" | "sslcommerz";

interface DbFields {
  postgresql: { connectionString: string };
  supabase: { projectUrl: string; serviceKey: string };
  mongodb: { mongoUri: string };
  firebase: { projectId: string; clientEmail: string; privateKey: string };
}

interface PayFields {
  stripe: { secretKey: string };
  amarpay: { storeId: string; signatureKey: string };
  lemonsqueezy: { apiKey: string; webhookSecret: string };
  paypal: { clientId: string; secret: string };
  sslcommerz: { storeId: string; storePassword: string };
}

const DB_OPTIONS: { value: DbProvider; label: string; icon: string }[] = [
  { value: "postgresql", label: "PostgreSQL", icon: "🐘" },
  { value: "supabase",   label: "Supabase",   icon: "⚡" },
  { value: "mongodb",    label: "MongoDB",    icon: "🍃" },
  { value: "firebase",   label: "Firebase",   icon: "🔥" },
];

const PAY_OPTIONS: { value: PayProvider; label: string; icon: string }[] = [
  { value: "stripe",       label: "Stripe",       icon: "💳" },
  { value: "amarpay",      label: "AmarPay",      icon: "🏦" },
  { value: "lemonsqueezy", label: "Lemon Squeezy", icon: "🍋" },
  { value: "paypal",       label: "PayPal",       icon: "🅿" },
  { value: "sslcommerz",   label: "SSLCommerz",   icon: "🔒" },
];

const LABEL = "block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5";
const INPUT = "w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors";
const SELECT_CLS = "w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer";

function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`${INPUT} pr-10`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 font-mono text-[10px] text-muted-foreground/50">{hint}</p>}
    </div>
  );
}

function ProviderPill<T extends string>({
  option,
  active,
  onClick,
}: {
  option: { value: T; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-sm border font-mono text-sm transition-all duration-150 ${
        active
          ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(0,240,255,0.15)]"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <span>{option.icon}</span>
      <span>{option.label}</span>
      {active && (
        <motion.span
          layoutId="provider-check"
          className="ml-auto"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
        </motion.span>
      )}
    </button>
  );
}

export default function GatewaySettings() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [dbProvider, setDbProvider] = useState<DbProvider>("postgresql");
  const [payProvider, setPayProvider] = useState<PayProvider>("stripe");

  const [dbFields, setDbFields] = useState<DbFields>({
    postgresql: { connectionString: "" },
    supabase: { projectUrl: "", serviceKey: "" },
    mongodb: { mongoUri: "" },
    firebase: { projectId: "", clientEmail: "", privateKey: "" },
  });

  const [payFields, setPayFields] = useState<PayFields>({
    stripe: { secretKey: "" },
    amarpay: { storeId: "", signatureKey: "" },
    lemonsqueezy: { apiKey: "", webhookSecret: "" },
    paypal: { clientId: "", secret: "" },
    sslcommerz: { storeId: "", storePassword: "" },
  });

  useEffect(() => {
    if (!user || !isOwner(user)) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const setDb = useCallback(
    <K extends DbProvider, F extends keyof DbFields[K]>(
      provider: K,
      field: F,
      value: DbFields[K][F],
    ) => {
      setDbFields((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], [field]: value },
      }));
    },
    [],
  );

  const setPay = useCallback(
    <K extends PayProvider, F extends keyof PayFields[K]>(
      provider: K,
      field: F,
      value: PayFields[K][F],
    ) => {
      setPayFields((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], [field]: value },
      }));
    },
    [],
  );

  const handleSave = () => {
    setSaving(true);
    setSaved(false);

    const config = {
      activeDatabase: dbProvider,
      activePament: payProvider,
      database: dbFields[dbProvider],
      payment: payFields[payProvider],
    };

    console.log("[GatewaySettings] Saved configuration:", JSON.stringify(config, null, 2));

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      toast({
        title: "Configuration saved",
        description: `Active providers: ${DB_OPTIONS.find((d) => d.value === dbProvider)?.label} + ${PAY_OPTIONS.find((p) => p.value === payProvider)?.label}`,
      });
      setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  return (
    <Layout>
      <div className="page-container py-14 sm:py-20 space-y-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary mb-2">
              <Zap className="w-3.5 h-3.5" />
              Universal Switchboard
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Gateway Settings
            </h1>
            <p className="mt-1.5 font-mono text-sm text-muted-foreground">
              Configure active database and payment providers. Changes apply on next server boot.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border bg-background font-mono text-xs text-muted-foreground">
            <Lock className="w-3 h-3 text-primary" />
            Owner Only
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
          {/* ── DATABASE SECTION ─────────────────────────────── */}
          <section className="rounded-sm border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-[#09090B]">
              <Database className="w-4 h-4 text-primary" />
              <span className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
                Database Provider
              </span>
            </div>

            <div className="p-8 space-y-7">
              {/* Provider picker */}
              <div>
                <label className={LABEL}>Active Database Provider</label>
                <div className="relative">
                  <select
                    className={SELECT_CLS}
                    value={dbProvider}
                    onChange={(e) => setDbProvider(e.target.value as DbProvider)}
                  >
                    {DB_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.icon}  {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Provider pills */}
              <div className="flex flex-wrap gap-2">
                {DB_OPTIONS.map((o) => (
                  <ProviderPill
                    key={o.value}
                    option={o}
                    active={dbProvider === o.value}
                    onClick={() => setDbProvider(o.value)}
                  />
                ))}
              </div>

              {/* Conditional fields */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={dbProvider}
                  {...SECTION_FADE}
                  className="space-y-4 pt-1"
                >
                  {dbProvider === "postgresql" && (
                    <PasswordInput
                      label="Connection String"
                      placeholder="postgresql://user:password@host:5432/dbname"
                      value={dbFields.postgresql.connectionString}
                      onChange={(v) => setDb("postgresql", "connectionString", v)}
                      hint="Maps to DATABASE_URL in .env"
                    />
                  )}

                  {dbProvider === "supabase" && (
                    <>
                      <PasswordInput
                        label="Project URL"
                        placeholder="https://your-project.supabase.co"
                        value={dbFields.supabase.projectUrl}
                        onChange={(v) => setDb("supabase", "projectUrl", v)}
                        hint="Maps to SUPABASE_URL"
                      />
                      <PasswordInput
                        label="Service Role Key"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
                        value={dbFields.supabase.serviceKey}
                        onChange={(v) => setDb("supabase", "serviceKey", v)}
                        hint="Maps to SUPABASE_SERVICE_ROLE_KEY"
                      />
                    </>
                  )}

                  {dbProvider === "mongodb" && (
                    <PasswordInput
                      label="MongoDB URI"
                      placeholder="mongodb+srv://user:password@cluster.mongodb.net/dbname"
                      value={dbFields.mongodb.mongoUri}
                      onChange={(v) => setDb("mongodb", "mongoUri", v)}
                      hint="Maps to MONGODB_URI"
                    />
                  )}

                  {dbProvider === "firebase" && (
                    <>
                      <PasswordInput
                        label="Project ID"
                        placeholder="your-firebase-project-id"
                        value={dbFields.firebase.projectId}
                        onChange={(v) => setDb("firebase", "projectId", v)}
                        hint="Maps to FIREBASE_PROJECT_ID"
                      />
                      <PasswordInput
                        label="Client Email"
                        placeholder="firebase-adminsdk@project.iam.gserviceaccount.com"
                        value={dbFields.firebase.clientEmail}
                        onChange={(v) => setDb("firebase", "clientEmail", v)}
                        hint="Maps to FIREBASE_CLIENT_EMAIL"
                      />
                      <PasswordInput
                        label="Private Key"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                        value={dbFields.firebase.privateKey}
                        onChange={(v) => setDb("firebase", "privateKey", v)}
                        hint="Maps to FIREBASE_PRIVATE_KEY"
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Active env badge */}
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-sm bg-background border border-border">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  ACTIVE_DATABASE=
                </span>
                <span className="font-mono text-xs text-primary">{dbProvider}</span>
              </div>
            </div>
          </section>

          {/* ── PAYMENT SECTION ──────────────────────────────── */}
          <section className="rounded-sm border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-[#09090B]">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
                Payment Gateway
              </span>
            </div>

            <div className="p-8 space-y-7">
              {/* Provider picker */}
              <div>
                <label className={LABEL}>Active Payment Gateway</label>
                <div className="relative">
                  <select
                    className={SELECT_CLS}
                    value={payProvider}
                    onChange={(e) => setPayProvider(e.target.value as PayProvider)}
                  >
                    {PAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.icon}  {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Provider pills */}
              <div className="flex flex-wrap gap-2">
                {PAY_OPTIONS.map((o) => (
                  <ProviderPill
                    key={o.value}
                    option={o}
                    active={payProvider === o.value}
                    onClick={() => setPayProvider(o.value)}
                  />
                ))}
              </div>

              {/* Conditional fields */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={payProvider}
                  {...SECTION_FADE}
                  className="space-y-4 pt-1"
                >
                  {payProvider === "stripe" && (
                    <PasswordInput
                      label="Secret Key"
                      placeholder="sk_live_..."
                      value={payFields.stripe.secretKey}
                      onChange={(v) => setPay("stripe", "secretKey", v)}
                      hint="Maps to STRIPE_SECRET_KEY — never use live keys in dev"
                    />
                  )}

                  {payProvider === "amarpay" && (
                    <>
                      <PasswordInput
                        label="Store ID"
                        placeholder="your-store-id"
                        value={payFields.amarpay.storeId}
                        onChange={(v) => setPay("amarpay", "storeId", v)}
                        hint="Maps to AMARPAY_STORE_ID"
                      />
                      <PasswordInput
                        label="Signature Key"
                        placeholder="your-signature-key"
                        value={payFields.amarpay.signatureKey}
                        onChange={(v) => setPay("amarpay", "signatureKey", v)}
                        hint="Maps to AMARPAY_SIGNATURE_KEY"
                      />
                    </>
                  )}

                  {payProvider === "lemonsqueezy" && (
                    <>
                      <PasswordInput
                        label="API Key"
                        placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1..."
                        value={payFields.lemonsqueezy.apiKey}
                        onChange={(v) => setPay("lemonsqueezy", "apiKey", v)}
                        hint="Maps to LEMONSQUEEZY_API_KEY"
                      />
                      <PasswordInput
                        label="Webhook Secret"
                        placeholder="wh_secret_..."
                        value={payFields.lemonsqueezy.webhookSecret}
                        onChange={(v) => setPay("lemonsqueezy", "webhookSecret", v)}
                        hint="Maps to LEMONSQUEEZY_WEBHOOK_SECRET"
                      />
                    </>
                  )}

                  {payProvider === "paypal" && (
                    <>
                      <PasswordInput
                        label="Client ID"
                        placeholder="AXbBvKzTq..."
                        value={payFields.paypal.clientId}
                        onChange={(v) => setPay("paypal", "clientId", v)}
                        hint="Maps to PAYPAL_CLIENT_ID"
                      />
                      <PasswordInput
                        label="Client Secret"
                        placeholder="EGPKrMnzB..."
                        value={payFields.paypal.secret}
                        onChange={(v) => setPay("paypal", "secret", v)}
                        hint="Maps to PAYPAL_CLIENT_SECRET"
                      />
                    </>
                  )}

                  {payProvider === "sslcommerz" && (
                    <>
                      <PasswordInput
                        label="Store ID"
                        placeholder="your-store-id"
                        value={payFields.sslcommerz.storeId}
                        onChange={(v) => setPay("sslcommerz", "storeId", v)}
                        hint="Maps to SSLCOMMERZ_STORE_ID"
                      />
                      <PasswordInput
                        label="Store Password"
                        placeholder="your-store-password"
                        value={payFields.sslcommerz.storePassword}
                        onChange={(v) => setPay("sslcommerz", "storePassword", v)}
                        hint="Maps to SSLCOMMERZ_STORE_PASSWORD"
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Active env badge */}
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-sm bg-background border border-border">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  ACTIVE_PAYMENT=
                </span>
                <span className="font-mono text-xs text-primary">{payProvider}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── SAVE BAR ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-6 px-8 py-6 rounded-sm border border-border bg-card">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary/60 shrink-0" />
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Values are logged to the server console on save. Add them to your{" "}
              <code className="text-primary">.env</code> file to persist across deployments.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-sm font-mono text-sm font-semibold transition-all duration-200 shrink-0 ${
              saved
                ? "bg-green-500/20 border border-green-500/60 text-green-400"
                : "bg-primary text-background hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_28px_rgba(0,240,255,0.4)]"
            }`}
          >
            {saving ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="inline-block"
                >
                  <Save className="w-4 h-4" />
                </motion.span>
                Saving…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>

        {/* ── REFERENCE CARD ───────────────────────────────── */}
        <section className="rounded-sm border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-[#09090B]">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              .env.example reference
            </span>
          </div>
          <div className="p-8">
            <pre className="font-mono text-xs text-muted-foreground leading-6 overflow-x-auto whitespace-pre">
{`# Switch providers by changing these two lines:
ACTIVE_DATABASE=${dbProvider.padEnd(12)}  # postgresql | supabase | mongodb | firebase
ACTIVE_PAYMENT=${payProvider.padEnd(13)}  # stripe | amarpay | lemonsqueezy | paypal | sslcommerz

${dbProvider === "postgresql" ? `DATABASE_URL=postgresql://user:pass@host:5432/axiomcraft` : ""}${dbProvider === "supabase" ? `SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=your-service-role-key` : ""}${dbProvider === "mongodb" ? `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/axiomcraft` : ""}${dbProvider === "firebase" ? `FIREBASE_PROJECT_ID=your-project-id\nFIREBASE_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com\nFIREBASE_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----` : ""}

${payProvider === "stripe" ? `STRIPE_SECRET_KEY=sk_live_...\nSTRIPE_WEBHOOK_SECRET=whsec_...` : ""}${payProvider === "amarpay" ? `AMARPAY_STORE_ID=your-store-id\nAMARPAY_SIGNATURE_KEY=your-signature-key` : ""}${payProvider === "lemonsqueezy" ? `LEMONSQUEEZY_API_KEY=eyJ...\nLEMONSQUEEZY_WEBHOOK_SECRET=wh_secret_...` : ""}${payProvider === "paypal" ? `PAYPAL_CLIENT_ID=AXbBv...\nPAYPAL_CLIENT_SECRET=EGPKr...` : ""}${payProvider === "sslcommerz" ? `SSLCOMMERZ_STORE_ID=your-store-id\nSSLCOMMERZ_STORE_PASSWORD=your-store-password` : ""}`}
            </pre>
          </div>
        </section>
        </form>
      </div>
    </Layout>
  );
}
