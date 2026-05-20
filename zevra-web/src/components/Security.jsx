import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';

const ITEMS = [
  {
    icon: Eye,
    title: 'Read-only access',
    desc: 'Zevra connects with read-only credentials. It cannot INSERT, UPDATE, DELETE, or DROP anything in your database — by design, not by policy.',
  },
  {
    icon: Lock,
    title: 'Schema-per-tenant isolation',
    desc: 'Every customer\'s data is isolated in its own schema. There is no shared database, no cross-tenant queries, no risk of data bleed.',
  },
  {
    icon: FileText,
    title: 'Complete query audit trail',
    desc: 'Every query Zevra runs is logged with the user, timestamp, question asked, and SQL executed. Full visibility, always.',
  },
  {
    icon: ShieldCheck,
    title: 'Your infrastructure, your control',
    desc: 'Zevra deploys into your environment or our managed cloud. Your data never leaves your network boundary without your explicit consent.',
  },
];

export default function Security() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="security" className="section-pad bg-gray-50">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-emerald-700 mb-5 before:content-[''] before:inline-block before:w-5 before:h-0.5 before:bg-emerald-700 before:rounded-full">
            Security & Trust
          </span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-gray-900 mb-4">
            Enterprise-grade security.<br />Zero compromises.
          </h2>
          <p className="text-[17px] text-gray-500 leading-relaxed">
            We built Zevra to pass enterprise security reviews.
            Because we know that's the first question your IT team will ask.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white border-[1.5px] border-gray-100 rounded-2xl p-6 text-center hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <item.icon size={22} className="text-emerald-brand" />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
