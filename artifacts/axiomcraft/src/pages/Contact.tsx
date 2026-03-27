import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Mail, Phone, MapPin, Send, CheckCircle, Cpu, Zap, Shield } from "lucide-react";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface ContactSettings {
  email:      string;
  emailSub:   string;
  phone:      string;
  phoneSub:   string;
  address:    string;
  addressSub: string;
}

const DEFAULTS: ContactSettings = {
  email:      "ops@axiomcraft.systems",
  emailSub:   "Response within 4 hours",
  phone:      "+1 (800) AXIOM-00",
  phoneSub:   "Mon–Fri, 08:00–22:00 UTC",
  address:    "Austin, TX 78701",
  addressSub: "Hardware Innovation District",
};

const reasons = [
  "Pre-sales / configuration advice",
  "Enterprise & bulk procurement",
  "Technical support",
  "Warranty & RMA",
  "Partnership enquiry",
  "Other",
];

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(0,240,255,0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function ContactCard({ icon: Icon, label, value, sub, index }: {
  icon: React.ElementType; label: string; value: string; sub: string; index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className="group border border-border bg-card/60 backdrop-blur-sm rounded-sm p-6 hover:border-primary/50 transition-colors relative overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <div className="w-10 h-10 border border-primary/30 bg-primary/10 flex items-center justify-center rounded-sm mb-4 group-hover:border-primary transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="font-heading font-bold text-lg text-foreground mb-1">{value}</p>
      <p className="font-mono text-xs text-muted-foreground">{sub}</p>
    </motion.div>
  );
}

export default function Contact() {
  const [settings, setSettings] = useState<ContactSettings>(DEFAULTS);
  const [formState, setFormState] = useState({ name: "", email: "", reason: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef(null);
  const formInView = useInView(formRef, { once: true });

  useEffect(() => {
    fetch(`${API}/contact-settings`)
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

  const contactCards = [
    { icon: Mail,  label: "TRANSMISSION", value: settings.email,   sub: settings.emailSub   },
    { icon: Phone, label: "DIRECT LINE",  value: settings.phone,   sub: settings.phoneSub   },
    { icon: MapPin,label: "COORDINATES",  value: settings.address, sub: settings.addressSub },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formState),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Transmission failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Transmission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-28 pb-16 overflow-hidden border-b border-border">
        <GridBackground />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 rounded-sm mb-8"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono tracking-widest text-primary uppercase">24/7 Protocol Support Active</span>
          </motion.div>

          <div className="max-w-3xl">
            {"CONTACT MISSION CONTROL".split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block mr-4"
              >
                <span className={`text-5xl md:text-7xl font-heading font-bold uppercase tracking-tighter ${i === 0 ? "text-foreground" : i === 1 ? "text-foreground" : "text-primary"}`}>
                  {word}
                </span>
              </motion.span>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg text-muted-foreground font-sans mt-6 max-w-xl border-l-2 border-primary pl-6"
          >
            Whether you're building a workstation, scaling an enterprise deployment, or need post-sale support — our engineers are standing by.
          </motion.p>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactCards.map((card, i) => (
              <ContactCard key={i} {...card} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Form + Info */}
      <section className="pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* Form */}
            <motion.div
              ref={formRef}
              variants={containerVariants}
              initial="hidden"
              animate={formInView ? "visible" : "hidden"}
              className="lg:col-span-3"
            >
              <motion.h2 variants={itemVariants} className="text-3xl font-heading font-bold uppercase mb-8">
                Open a Ticket
              </motion.h2>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="border border-primary/50 bg-primary/5 rounded-sm p-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle className="w-16 h-16 text-primary mx-auto mb-6" />
                  </motion.div>
                  <h3 className="text-2xl font-heading font-bold uppercase mb-3">Transmission Received</h3>
                  <p className="text-muted-foreground font-mono text-sm mb-8">
                    Your message has been routed to our engineering team.<br />
                    Expect a response within {settings.emailSub.replace("Response within ", "")}.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setFormState({ name: "", email: "", reason: "", message: "" }); }}
                    className="px-6 py-3 border border-primary text-primary font-mono text-sm uppercase hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { name: "name",  label: "Operator Name",  placeholder: "Your full name",   type: "text"  },
                      { name: "email", label: "Secure Channel", placeholder: "your@email.com",   type: "email" },
                    ].map((field) => (
                      <motion.div key={field.name} variants={itemVariants}>
                        <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          required
                          placeholder={field.placeholder}
                          value={formState[field.name as "name" | "email"]}
                          onChange={(e) => setFormState((s) => ({ ...s, [field.name]: e.target.value }))}
                          className="w-full bg-card border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_1px_rgba(0,240,255,0.3)] transition-all"
                        />
                      </motion.div>
                    ))}
                  </div>

                  <motion.div variants={itemVariants}>
                    <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      Mission Type
                    </label>
                    <select
                      required
                      value={formState.reason}
                      onChange={(e) => setFormState((s) => ({ ...s, reason: e.target.value }))}
                      className="w-full bg-card border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_1px_rgba(0,240,255,0.3)] transition-all"
                    >
                      <option value="">Select a category...</option>
                      {reasons.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      Message Payload
                    </label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Describe your requirements in detail..."
                      value={formState.message}
                      onChange={(e) => setFormState((s) => ({ ...s, message: e.target.value }))}
                      className="w-full bg-card border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_1px_rgba(0,240,255,0.3)] transition-all resize-none"
                    />
                  </motion.div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-mono text-xs text-red-400 border border-red-400/30 bg-red-400/5 px-4 py-3 rounded-sm"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.div variants={itemVariants}>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm hover:bg-primary/90 disabled:opacity-60 transition-all relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/10"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.5 }}
                      />
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Transmitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          Transmit Message
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </form>
              )}
            </motion.div>

            {/* Sidebar info */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={formInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="border border-border bg-card/40 rounded-sm p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <Cpu className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-heading font-bold uppercase mb-4">SLA Guarantees</h3>
                <ul className="space-y-3">
                  {[
                    "4-hour initial response on all tickets",
                    "Priority queue for enterprise accounts",
                    "Dedicated engineer for RMA requests",
                    "99.9% system uptime guarantee",
                    "On-site support available in 48 states",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={formInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
                      className="flex items-start gap-3 text-sm font-mono text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={formInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="border border-border bg-card/40 rounded-sm p-8"
              >
                <Shield className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-heading font-bold uppercase mb-3">Secure Comms</h3>
                <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                  All transmissions are end-to-end encrypted. Your technical specifications and business data are protected by AES-256 at rest and in transit.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={formInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center"
              >
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-primary font-mono text-sm hover:underline uppercase"
                >
                  Browse Hardware Catalog →
                </Link>
              </motion.div>
            </div>

          </div>
        </div>
      </section>
    </Layout>
  );
}
