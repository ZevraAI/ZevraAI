import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const DBS = [
  { name: 'PostgreSQL', emoji: '🐘', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { name: 'MySQL', emoji: '🐬', color: 'text-orange-600 bg-orange-50 border-orange-100' },
  { name: 'SQL Server', emoji: '🪟', color: 'text-sky-600 bg-sky-50 border-sky-100' },
  { name: 'Oracle', emoji: '🔴', color: 'text-red-600 bg-red-50 border-red-100' },
  { name: 'Snowflake', emoji: '❄️', color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
  { name: 'BigQuery', emoji: '📊', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { name: 'Redshift', emoji: '⚡', color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { name: 'MariaDB', emoji: '🦭', color: 'text-teal-600 bg-teal-50 border-teal-100' },
];

export default function Integrations() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="section-pad bg-white">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-emerald-700 mb-5 before:content-[''] before:inline-block before:w-5 before:h-0.5 before:bg-emerald-700 before:rounded-full">
            Integrations
          </span>
          <h2 className="text-[34px] lg:text-[42px] font-black tracking-tight leading-[1.08] text-gray-900 mb-4">
            Works with the databases<br />you already run.
          </h2>
          <p className="text-[16px] text-gray-500 leading-relaxed">
            No middleware, no replication, no changes to your schema.
            Zevra connects directly and reads what's there.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {DBS.map((db, i) => (
            <motion.div
              key={db.name}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-[1.5px] ${db.color} font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-md cursor-default`}
            >
              <span className="text-[18px]">{db.emoji}</span>
              {db.name}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-[13px] text-gray-400 mt-8"
        >
          More integrations coming. Don't see yours?{' '}
          <a href="/demo" className="text-emerald-700 font-semibold hover:underline">Tell us.</a>
        </motion.p>
      </div>
    </section>
  );
}
