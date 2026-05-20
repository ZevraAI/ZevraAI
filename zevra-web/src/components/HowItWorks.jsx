import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { PlugZap, MessageSquareText, BellRing } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: PlugZap,
    title: 'Connect your databases',
    body: 'Point Zevra at your existing databases — PostgreSQL, MySQL, SQL Server, Oracle, Snowflake, and more. No data migration, no copying, no ETL pipelines.',
    tag: 'Zero data migration',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    numColor: 'text-emerald-400/20',
  },
  {
    num: '02',
    icon: MessageSquareText,
    title: 'Ask in plain English',
    body: 'Type a question the way you would ask a colleague. Zevra understands your business entities, relationships, and vocabulary — no SQL, no dashboards, no waiting for a report.',
    tag: 'No technical skills needed',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
    numColor: 'text-violet-400/20',
  },
  {
    num: '03',
    icon: BellRing,
    title: 'Intelligence, delivered',
    body: 'Get instant answers with live data tables. Schedule reports to run automatically and land in email or Slack. Receive proactive alerts the moment something deviates from normal.',
    tag: 'Proactive, not reactive',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
    numColor: 'text-sky-400/20',
  },
];

function Step({ step, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
      className="relative"
    >
      {/* Connector line (desktop) */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-10 left-[calc(100%+1px)] w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" style={{ width: 'calc(100% - 80px)', left: '80px' }} />
      )}

      <div className="relative z-10">
        {/* Number + icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center shrink-0`}>
            <step.icon size={26} className={step.color} />
          </div>
          <span className={`text-[56px] font-black ${step.numColor} leading-none tracking-tight select-none`}>
            {step.num}
          </span>
        </div>

        <h3 className="text-[20px] font-bold text-white mb-3 tracking-tight">{step.title}</h3>
        <p className="text-[14.5px] text-zinc-400 leading-relaxed mb-4">{step.body}</p>
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${step.color} ${step.bg} ${step.border} border px-3 py-1 rounded-full`}>
          ✓ {step.tag}
        </span>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="how" className="section-pad bg-white">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-emerald-700 mb-5 before:content-[''] before:inline-block before:w-5 before:h-0.5 before:bg-emerald-600 before:rounded-full">
            How it works
          </span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-gray-900 mb-4">
            From question to insight<br />in seconds.
          </h2>
          <p className="text-[17px] text-gray-500 leading-relaxed">
            No training sessions. No implementation consultants.
            Most teams are live the same day they sign up.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-8 relative">
          {steps.map((step, i) => (
            <Step key={step.title} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
