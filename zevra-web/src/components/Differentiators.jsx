import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { DatabaseZap, Globe2, Rocket, ShieldCheck } from 'lucide-react';

const ITEMS = [
  {
    icon: DatabaseZap,
    stat: 'Any',
    label: 'database',
    title: 'Any database, any cloud',
    desc: 'PostgreSQL, MySQL, SQL Server, Oracle, Snowflake, BigQuery, Redshift — Zevra connects to whatever you already run. No migration, no lock-in.',
    color: 'text-emerald-400',
    glow: 'rgba(16,185,129,0.15)',
  },
  {
    icon: Globe2,
    stat: 'Any',
    label: 'industry',
    title: 'Genuinely domain-agnostic',
    desc: 'Healthcare, hospitality, logistics, retail, finance, manufacturing — Zevra adapts to your vocabulary, your entities, and your business model.',
    color: 'text-violet-400',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    icon: Rocket,
    stat: '<1',
    label: 'day to live',
    title: 'Live the same day',
    desc: 'No implementation consultants, no training programmes, no multi-month rollout. Connect your database, onboard your schema, start asking questions.',
    color: 'text-sky-400',
    glow: 'rgba(56,189,248,0.15)',
  },
  {
    icon: ShieldCheck,
    stat: '0',
    label: 'data copies',
    title: 'Read-only, always audited',
    desc: 'Zevra never writes to your database. Every query is logged with a full audit trail. Your data stays exactly where it is — in your infrastructure.',
    color: 'text-amber-400',
    glow: 'rgba(251,191,36,0.15)',
  },
];

function DiffCard({ item, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
      className="glass-card-hover p-7 group"
      style={{ '--glow': item.glow }}
    >
      <div className={`w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
        <item.icon size={22} className={item.color} />
      </div>
      <div className="mb-4">
        <span className={`text-[52px] font-black leading-none ${item.color} tracking-tight`}>{item.stat}</span>
        <span className="ml-2 text-[14px] text-zinc-500 font-medium">{item.label}</span>
      </div>
      <h3 className="text-[16px] font-bold text-white mb-2 tracking-tight">{item.title}</h3>
      <p className="text-[13.5px] text-zinc-400 leading-relaxed">{item.desc}</p>
    </motion.div>
  );
}

export default function Differentiators() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="section-pad bg-[#080A0F]">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="eyebrow">Why Zevra</span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-white mb-4">
            The platform that fits<br />your world.
          </h2>
          <p className="text-[17px] text-zinc-400 leading-relaxed">
            We didn't build Zevra for one industry. We built it for every enterprise
            that deserves better access to its own data.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ITEMS.map((item, i) => (
            <DiffCard key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
