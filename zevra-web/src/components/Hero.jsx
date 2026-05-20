import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Zap, Globe } from 'lucide-react';
import ChatDemo from './ChatDemo';

const proof = [
  { icon: ShieldCheck, label: 'Read-only · Fully audited' },
  { icon: Zap, label: 'Live in under a day' },
  { icon: Globe, label: 'Any industry · Any database' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full bg-emerald-brand/20 blur-[120px] opacity-60" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-900/20 blur-[100px] opacity-50" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-900/20 blur-[80px] opacity-40" />
      </div>

      <div className="container-pad w-full relative z-10 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — copy */}
          <div>
            <motion.div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[12px] font-semibold tracking-wide mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Enterprise Operational Intelligence
              </span>
            </motion.div>

            <motion.h1
              {...fadeUp(0.08)}
              className="text-[52px] sm:text-[64px] lg:text-[72px] font-black tracking-[-0.04em] leading-[1.01] mb-6 text-white"
            >
              Ask your{' '}
              <span className="grad-text">data</span>
              <br />
              anything.
            </motion.h1>

            <motion.p
              {...fadeUp(0.16)}
              className="text-[17px] lg:text-[18px] text-zinc-400 leading-[1.7] max-w-[520px] mb-10"
            >
              Zevra connects to your existing databases and delivers instant answers,
              proactive alerts, and automated intelligence reports —{' '}
              <span className="text-zinc-200 font-medium">for any industry, any team.</span>
            </motion.p>

            <motion.div {...fadeUp(0.22)} className="flex flex-wrap gap-3 mb-14">
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-[15px] rounded-xl transition-all shadow-xl shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:-translate-y-0.5"
              >
                Get a Demo
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] text-white font-semibold text-[15px] rounded-xl transition-all"
              >
                <Play size={14} className="fill-white" />
                See how it works
              </button>
            </motion.div>

            <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-x-6 gap-y-3">
              {proof.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[13px] text-zinc-500">
                  <Icon size={14} className="text-emerald-500 shrink-0" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — animated chat demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <ChatDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
