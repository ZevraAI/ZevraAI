import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const CASES = [
  {
    emoji: '🏥',
    industry: 'Healthcare',
    desc: 'Operational intelligence for patient flow, billing, staffing, and compliance.',
    questions: [
      'Which wards have the longest average discharge time this week?',
      'Show me patients with pending lab results older than 24 hours.',
    ],
    accent: 'hover:border-rose-300 hover:shadow-rose-100/60',
  },
  {
    emoji: '🏨',
    industry: 'Hospitality',
    desc: 'Revenue management, guest satisfaction, and operational efficiency at a glance.',
    questions: [
      'What is our RevPAR trend for Q1 vs last year by property?',
      'Which amenities have the lowest guest satisfaction scores this month?',
    ],
    accent: 'hover:border-amber-300 hover:shadow-amber-100/60',
  },
  {
    emoji: '🚚',
    industry: 'Logistics',
    desc: 'Real-time visibility into shipments, suppliers, and fulfilment performance.',
    questions: [
      'Which shipments are at risk of missing their delivery window today?',
      'Show me supplier on-time delivery rates for Q3 by region.',
    ],
    accent: 'hover:border-blue-300 hover:shadow-blue-100/60',
  },
  {
    emoji: '🛍️',
    industry: 'Retail',
    desc: 'Product performance, inventory health, and customer behaviour intelligence.',
    questions: [
      'Which product categories are trending down in the Northeast?',
      'Show me stores with inventory below reorder point right now.',
    ],
    accent: 'hover:border-violet-300 hover:shadow-violet-100/60',
  },
  {
    emoji: '🏦',
    industry: 'Financial Services',
    desc: 'Transaction monitoring, portfolio insights, and regulatory intelligence.',
    questions: [
      'Show me accounts with unusual transaction volume this month.',
      'Which portfolios underperformed their benchmark in Q2?',
    ],
    accent: 'hover:border-emerald-300 hover:shadow-emerald-100/60',
  },
  {
    emoji: '🏭',
    industry: 'Manufacturing',
    desc: 'Production efficiency, downtime analysis, and quality control intelligence.',
    questions: [
      'Which production lines had the most unplanned downtime last quarter?',
      'Show me defect rates by shift and line for this month.',
    ],
    accent: 'hover:border-orange-300 hover:shadow-orange-100/60',
  },
];

function CaseCard({ c, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.1 }}
      className={`group bg-white border-[1.5px] border-gray-100 rounded-2xl p-6 transition-all duration-200 cursor-default ${c.accent} hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="text-3xl mb-4">{c.emoji}</div>
      <h3 className="text-[17px] font-bold text-gray-900 mb-1.5">{c.industry}</h3>
      <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">{c.desc}</p>
      <div className="space-y-2.5">
        {c.questions.map((q, i) => (
          <div key={i} className="bg-gray-50 rounded-xl px-3.5 py-2.5 text-[12.5px] text-gray-600 leading-snug border border-gray-100 group-hover:border-gray-200 transition-colors">
            <span className="text-emerald-brand font-bold mr-1">"</span>{q}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function UseCases() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="usecases" className="section-pad bg-gray-50">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-emerald-700 mb-5 before:content-[''] before:inline-block before:w-5 before:h-0.5 before:bg-emerald-700 before:rounded-full">
            Use Cases
          </span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-gray-900 mb-4">
            Built for every<br />industry.
          </h2>
          <p className="text-[17px] text-gray-500 leading-relaxed">
            Zevra speaks the language of your business — not just your database.
            The same platform powers intelligence across radically different domains.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CASES.map((c, i) => (
            <CaseCard key={c.industry} c={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
