import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  MessageSquareText, Network, BellRing, CalendarClock,
  Paperclip, Layers, Bot, Table2, BarChart3, FileText,
} from 'lucide-react';

const FEATURES = [
  {
    icon: MessageSquareText,
    label: 'Natural Language Q&A',
    title: 'Ask anything. Get answers instantly.',
    desc: 'Type a question the way you\'d ask a colleague. Zevra translates natural language into precise SQL, queries your live databases, and returns a structured answer with full data tables — in seconds.',
    bullets: ['Live database queries, not cached data', 'Follow-up questions with conversation context', 'Exports to CSV, Excel, PDF, or Markdown'],
    mock: <NLQMock />,
  },
  {
    icon: Network,
    label: 'Knowledge Graph',
    title: 'See how your data connects.',
    desc: 'Zevra auto-discovers relationships between your business entities by reading foreign keys and column heuristics. Explore entities visually, find JOIN paths between any two tables, and copy production-ready SQL instantly.',
    bullets: ['Auto-discovery from FK constraints', 'Visual entity explorer with column detail', 'JOIN path finder with generated SQL'],
    mock: <GraphMock />,
  },
  {
    icon: BellRing,
    label: 'Proactive Alerts',
    title: 'Know before it becomes a problem.',
    desc: 'Define thresholds on any metric. When your data deviates from the baseline, Zevra notifies your team via Slack or email — with context, root cause hints, and a direct link to investigate further.',
    bullets: ['AI-composed alert messages', 'Slack and email delivery', 'Cooldown periods to prevent alert fatigue'],
    mock: <AlertMock />,
  },
  {
    icon: CalendarClock,
    label: 'Scheduled Reports',
    title: 'Intelligence delivered on a schedule.',
    desc: 'Turn any investigation into a recurring report. Schedule it daily, weekly, or monthly. Results arrive in your inbox or Slack channel formatted as a professional multi-section report with tables and insights.',
    bullets: ['Pin any conversation as a scheduled report', 'Email and Slack delivery', 'Rich HTML reports with data tables'],
    mock: <ReportMock />,
  },
  {
    icon: Paperclip,
    label: 'File & Image Analysis',
    title: 'Upload anything. Get intelligence.',
    desc: 'Attach spreadsheets, PDFs, images, or CSVs to any question. Zevra extracts the content, cross-references it against your live database, and tells you what matches, what\'s missing, and what\'s different.',
    bullets: ['CSV, Excel, PDF, DOCX, images up to 20 MB', 'GPT-4o Vision for images and screenshots', 'Cross-reference file data against live database'],
    mock: <FileMock />,
  },
  {
    icon: Layers,
    label: 'Semantic Layer',
    title: 'Teach Zevra your business vocabulary.',
    desc: 'Map technical column names to business terms. Define entity relationships, lifecycle stages, and domain vocabulary. The more context you give Zevra, the more precise and relevant its answers become.',
    bullets: ['Business term mapping', 'Entity lifecycle definitions', 'Domain vocabulary management'],
    mock: <SemanticMock />,
  },
];

function NLQMock() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="bg-emerald-brand text-white text-[12.5px] px-4 py-2.5 rounded-[14px] rounded-br-sm max-w-[85%] leading-relaxed">
          Which regions had revenue below target last month?
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-emerald-brand/80 flex items-center justify-center shrink-0">
          <Bot size={12} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] text-zinc-300 mb-2.5 leading-relaxed">
            <strong className="text-white">2 regions</strong> missed target. East is the largest gap at −14%, driven by 3 underperforming accounts.
          </p>
          <div className="rounded-lg overflow-hidden border border-white/[0.08] text-[11px]">
            <table className="w-full border-collapse">
              <thead><tr>
                {['Region','Revenue','Target','Gap'].map(h=><th key={h} className="bg-emerald-brand/60 text-white/80 px-2.5 py-1.5 text-left font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {[['East','$1.2M','$1.4M','−14%'],['South','$1.7M','$1.9M','−11%'],['North','$2.4M','$2.1M','+14%']].map((r,i)=>(
                  <tr key={i} className={i%2===0?'bg-white/[0.02]':''}>
                    {r.map((c,ci)=>(
                      <td key={ci} className={`px-2.5 py-1.5 border-t border-white/[0.05] ${ci===3?(c.startsWith('−')?'text-red-400':'text-emerald-400')+' font-semibold':'text-zinc-400'}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphMock() {
  const nodes = [
    { label: 'Customer', x: '10%', y: '10%', color: 'bg-violet-500/20 border-violet-400/30 text-violet-300' },
    { label: 'Order', x: '55%', y: '5%', color: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' },
    { label: 'Product', x: '78%', y: '45%', color: 'bg-sky-500/20 border-sky-400/30 text-sky-300' },
    { label: 'Invoice', x: '40%', y: '60%', color: 'bg-amber-500/20 border-amber-400/30 text-amber-300' },
    { label: 'Region', x: '8%', y: '60%', color: 'bg-rose-500/20 border-rose-400/30 text-rose-300' },
  ];
  return (
    <div className="relative h-44 select-none">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 180">
        <line x1="80" y1="28" x2="230" y2="18" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="230" y1="18" x2="330" y2="90" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="230" y1="18" x2="170" y2="115" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="80" y1="28" x2="40" y2="115" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="170" y1="115" x2="330" y2="90" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3"/>
      </svg>
      {nodes.map(n => (
        <div key={n.label} className={`absolute px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${n.color} -translate-x-1/2 -translate-y-1/2`}
          style={{ left: n.x, top: n.y }}>
          {n.label}
        </div>
      ))}
    </div>
  );
}

function AlertMock() {
  return (
    <div className="space-y-2.5">
      {[
        { sev: 'HIGH', color: 'border-red-400/40 bg-red-400/5', dot: 'bg-red-400', title: 'Revenue below threshold', msg: 'North region Q4 revenue dropped 18% below the 7-day moving average.', time: '2 min ago' },
        { sev: 'MED', color: 'border-amber-400/40 bg-amber-400/5', dot: 'bg-amber-400', title: 'Unusual activity detected', msg: 'Transaction volume spiked 3.2× above baseline in the last hour.', time: '14 min ago' },
      ].map(a => (
        <div key={a.title} className={`rounded-xl border ${a.color} p-3`}>
          <div className="flex items-start gap-2.5">
            <span className={`w-2 h-2 rounded-full ${a.dot} mt-1 shrink-0 animate-pulse`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[12px] font-bold text-white">{a.title}</span>
                <span className="text-[10px] text-zinc-600 shrink-0">{a.time}</span>
              </div>
              <p className="text-[11.5px] text-zinc-400 leading-snug">{a.msg}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
        <span className="font-semibold text-zinc-300">Weekly Operations Report</span>
        <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Active</span>
      </div>
      {[
        { q: 'Which regions exceeded targets this week?', icon: BarChart3 },
        { q: 'Show top 10 accounts by revenue.', icon: Table2 },
        { q: 'Summarise any anomalies vs last week.', icon: FileText },
      ].map(({ q, icon: Icon }, i) => (
        <div key={i} className="flex items-center gap-2.5 bg-white/[0.04] rounded-lg px-3 py-2">
          <Icon size={12} className="text-zinc-500 shrink-0" />
          <span className="text-[12px] text-zinc-400">{q}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-600">
        <CalendarClock size={11} />
        <span>Every Monday at 08:00 · Email + Slack</span>
      </div>
    </div>
  );
}

function FileMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 bg-violet-500/10 border border-violet-400/20 rounded-xl px-3 py-2.5">
        <span className="text-lg">📊</span>
        <div>
          <p className="text-[12px] font-semibold text-violet-300">Q3_reconciliation.xlsx</p>
          <p className="text-[10.5px] text-zinc-500">847 rows · 12 columns extracted</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="bg-emerald-brand text-white text-[12px] px-3.5 py-2 rounded-[12px] rounded-br-sm max-w-[90%]">
          Which of these transactions don't exist in our system?
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-md bg-emerald-brand/80 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={11} className="text-white" />
        </div>
        <p className="text-[12px] text-zinc-300 leading-relaxed">
          <strong className="text-white">23 transactions</strong> from the file were not found in the database. 814 matched successfully. Possible causes: date range mismatch or pending import.
        </p>
      </div>
    </div>
  );
}

function SemanticMock() {
  const entities = [
    { name: 'Customer', cols: ['customer_id', 'full_name', 'tier'], mapped: 'Account' },
    { name: 'trx_ledger', cols: ['trx_id', 'amt', 'ts'], mapped: 'Transaction' },
  ];
  return (
    <div className="space-y-3">
      {entities.map(e => (
        <div key={e.name} className="bg-white/[0.04] rounded-xl border border-white/[0.07] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-zinc-300 font-mono">{e.name}</span>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full">→ {e.mapped}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {e.cols.map(c => (
              <span key={c} className="text-[10.5px] font-mono text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-zinc-600 text-center">Vocabulary + relationships auto-suggested</p>
    </div>
  );
}

export default function Features() {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="features" className="section-pad bg-[#080A0F]">
      <div className="container-pad">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-14"
        >
          <span className="eyebrow">Platform Features</span>
          <h2 className="text-[38px] lg:text-[48px] font-black tracking-tight leading-[1.06] text-white mb-4">
            Everything your team needs<br />to stay ahead.
          </h2>
          <p className="text-[17px] text-zinc-400 leading-relaxed">
            One platform. Every operational intelligence capability your enterprise needs.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-10 items-start">
          {/* Tabs */}
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:sticky lg:top-24">
            {FEATURES.map((f, i) => (
              <button
                key={f.label}
                onClick={() => setActive(i)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left shrink-0 transition-all duration-200 ${
                  active === i
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active === i ? 'bg-emerald-500/15' : 'bg-white/[0.05]'}`}>
                  <f.icon size={15} className={active === i ? 'text-emerald-400' : 'text-zinc-500'} />
                </div>
                <span className="text-[13px] font-semibold whitespace-nowrap">{f.label}</span>
              </button>
            ))}
          </div>

          {/* Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="glass-card p-8"
            >
              <h3 className="text-[26px] font-black tracking-tight text-white mb-3">
                {FEATURES[active].title}
              </h3>
              <p className="text-[15px] text-zinc-400 leading-relaxed mb-6 max-w-lg">
                {FEATURES[active].desc}
              </p>
              <ul className="space-y-2 mb-8">
                {FEATURES[active].bullets.map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-[13.5px] text-zinc-300">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              {/* Feature mockup */}
              <div className="bg-[#0d1117] rounded-xl border border-white/[0.07] p-5">
                {FEATURES[active].mock}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
