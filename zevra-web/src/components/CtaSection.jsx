import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export default function CtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="relative section-pad overflow-hidden bg-[#080A0F]">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-brand/25 blur-[100px]" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-violet-900/15 blur-[80px]" />
      </div>

      <div className="container-pad relative z-10 text-center" ref={ref}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-brand to-emerald-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-900/50"
        >
          <Zap size={26} className="text-white fill-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-[42px] sm:text-[56px] lg:text-[64px] font-black tracking-[-0.04em] leading-[1.01] text-white mb-5"
        >
          See Zevra in<br />
          <span className="grad-text">your environment.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-[18px] text-zinc-400 max-w-lg mx-auto mb-10 leading-relaxed"
        >
          Most teams go live the same day. No professional services.
          No migration. Just connect and ask.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[16px] rounded-2xl transition-all shadow-2xl shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:-translate-y-0.5"
          >
            Schedule a Live Demo
            <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white font-semibold text-[16px] rounded-2xl transition-all"
          >
            Explore features
          </a>
        </motion.div>
      </div>
    </section>
  );
}
