import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const TIERS = [
  {
    name: 'Starter',
    monthly: 499,
    annual: 399,
    desc: 'For teams getting started with operational intelligence.',
    features: [
      '1 database connection',
      'Up to 5 users',
      'Natural language Q&A',
      'Email reports',
      'Knowledge Graph',
      'Standard support',
    ],
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'Growth',
    monthly: 1499,
    annual: 1199,
    desc: 'For scaling teams that need more power and integrations.',
    features: [
      'Up to 5 database connections',
      'Up to 25 users',
      'Everything in Starter',
      'Proactive alerts',
      'Slack + email delivery',
      'File & image analysis',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    monthly: null,
    annual: null,
    desc: 'For large organisations with complex requirements.',
    features: [
      'Unlimited database connections',
      'Unlimited users',
      'Everything in Growth',
      'SSO / SAML',
      'Custom data residency',
      'SLA guarantee',
      'Dedicated success manager',
    ],
    cta: 'Talk to sales',
    highlight: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="pricing" className="section-pad bg-[#080A0F]">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-6"
        >
          <span className="eyebrow">Pricing</span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-white mb-4">
            Transparent pricing.<br />No surprises.
          </h2>
          <p className="text-[17px] text-zinc-400 leading-relaxed">
            Start with a free trial. Cancel anytime. Scale when you're ready.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-[14px] font-medium ${!annual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
            className={`relative w-11 h-6 rounded-full border transition-colors ${annual ? 'bg-emerald-500 border-emerald-500' : 'bg-white/[0.08] border-white/[0.14]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-[14px] font-medium flex items-center gap-2 ${annual ? 'text-white' : 'text-zinc-500'}`}>
            Annual
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">Save 20%</span>
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-7 border ${
                tier.highlight
                  ? 'bg-emerald-500/[0.07] border-emerald-500/30 shadow-2xl shadow-emerald-900/20'
                  : 'glass-card'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[11px] font-bold px-3.5 py-1 rounded-full tracking-wide uppercase">
                  {tier.badge}
                </div>
              )}

              <p className="text-[12px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">{tier.name}</p>

              <div className="mb-2">
                {tier.monthly ? (
                  <div className="flex items-end gap-1.5">
                    <span className="text-[42px] font-black text-white leading-none tracking-tight">
                      ${annual ? tier.annual : tier.monthly}
                    </span>
                    <span className="text-zinc-500 text-[14px] mb-1.5">/month</span>
                  </div>
                ) : (
                  <div className="text-[36px] font-black text-white leading-none tracking-tight">Custom</div>
                )}
              </div>

              <p className="text-[12px] text-zinc-600 min-h-[18px] mb-1">
                {tier.monthly && annual ? `Billed annually · $${tier.annual * 12}/yr` : ''}
              </p>

              <p className="text-[13.5px] text-zinc-400 leading-relaxed mb-6 mt-2">{tier.desc}</p>

              <hr className="border-white/[0.07] mb-6" />

              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-zinc-300">
                    <span className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-emerald-400" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/demo"
                className={`block w-full text-center py-3 rounded-xl text-[14px] font-semibold transition-all ${
                  tier.highlight
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/30 hover:-translate-y-0.5'
                    : 'bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white'
                }`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-[13px] text-zinc-600 mt-8"
        >
          All plans include a 14-day free trial. No credit card required.
        </motion.p>
      </div>
    </section>
  );
}
