import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { DatabaseZap, Timer, UserX } from 'lucide-react';

const problems = [
  {
    icon: DatabaseZap,
    title: 'Your data is scattered',
    body: 'Operational data lives across dozens of disconnected systems. Getting a complete picture means waiting for IT, running exports, and stitching spreadsheets together manually.',
    accent: 'from-red-500/20 to-orange-500/10',
    iconBg: 'bg-red-500/10 border-red-500/20',
    iconColor: 'text-red-400',
    bar: 'from-red-500 to-orange-400',
  },
  {
    icon: Timer,
    title: 'Insights arrive too late',
    body: "By the time the weekly report lands in your inbox, the problem has already escalated. Reactive decisions based on yesterday's data cost revenue and erode trust.",
    accent: 'from-amber-500/20 to-yellow-500/10',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    bar: 'from-amber-500 to-yellow-400',
  },
  {
    icon: UserX,
    title: 'Teams can\'t self-serve',
    body: 'Non-technical teams depend on analysts for every question. Every bottleneck delays a decision. Every delay has a cost. Your data team is buried in ad-hoc requests.',
    accent: 'from-rose-500/20 to-pink-500/10',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
    bar: 'from-rose-500 to-pink-400',
  },
];

function ProblemCard({ icon: Icon, title, body, accent, iconBg, iconColor, bar, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
      className={`relative rounded-2xl border border-white/[0.08] bg-gradient-to-br ${accent} p-7 overflow-hidden group hover:border-white/[0.14] transition-colors`}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${bar}`} />
      <div className={`inline-flex w-11 h-11 items-center justify-center rounded-xl border ${iconBg} mb-5`}>
        <Icon size={20} className={iconColor} />
      </div>
      <h3 className="text-[17px] font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-[14px] text-zinc-400 leading-relaxed">{body}</p>
    </motion.div>
  );
}

export default function Problem() {
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
          className="max-w-2xl mb-14"
        >
          <span className="eyebrow">The Problem</span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-white mb-4">
            Operational data shouldn't<br />require a data team.
          </h2>
          <p className="text-[17px] text-zinc-400 leading-relaxed">
            Enterprise teams are drowning in data but starving for insights.
            The tools exist — the access doesn't.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <ProblemCard key={p.title} {...p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
