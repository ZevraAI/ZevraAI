import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, ArrowLeft } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const INDUSTRIES = [
  'Healthcare', 'Hospitality & Travel', 'Logistics & Supply Chain',
  'Retail & E-commerce', 'Financial Services', 'Manufacturing',
  'Real Estate', 'Education', 'Energy & Utilities', 'Other',
];

const SIZES = ['1–10', '11–50', '51–250', '251–1,000', '1,000+'];

const PROOF = [
  'Live in under a day',
  'Read-only · No data migration',
  '14-day free trial · No credit card',
];

export default function Demo() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', company: '',
    title: '', industry: '', teamSize: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitted(true);
    setLoading(false);
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all';
  const labelCls = 'block text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wide';

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-white pt-16">
        {/* Top bar */}
        <div className="bg-[#080A0F] border-b border-white/[0.07]">
          <div className="container-pad py-16 lg:py-24">
            <div className="max-w-2xl">
              <Link to="/" className="inline-flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
                <ArrowLeft size={14} /> Back to Zevra
              </Link>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-[38px] lg:text-[52px] font-black tracking-tight leading-[1.06] text-white mb-4"
              >
                See Zevra in<br />
                <span className="grad-text">your environment.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[17px] text-zinc-400 leading-relaxed"
              >
                Tell us about your team. We'll set up a personalised live demo
                using your industry and show you exactly how Zevra fits your workflow.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Form section */}
        <div className="container-pad py-16">
          <div className="grid lg:grid-cols-[1fr_420px] gap-14 items-start">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {submitted ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="text-[28px] font-black text-gray-900 tracking-tight mb-3">We'll be in touch shortly.</h2>
                  <p className="text-[16px] text-gray-500 max-w-md mx-auto leading-relaxed mb-8">
                    Thanks, {form.firstName}. Someone from our team will reach out within one business day to schedule your personalised demo.
                  </p>
                  <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all">
                    <ArrowLeft size={15} /> Back to Zevra
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>First name *</label>
                      <input required className={inputCls} placeholder="Jane" value={form.firstName} onChange={set('firstName')} />
                    </div>
                    <div>
                      <label className={labelCls}>Last name *</label>
                      <input required className={inputCls} placeholder="Smith" value={form.lastName} onChange={set('lastName')} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Work email *</label>
                    <input required type="email" className={inputCls} placeholder="jane@company.com" value={form.email} onChange={set('email')} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Company *</label>
                      <input required className={inputCls} placeholder="Acme Corp" value={form.company} onChange={set('company')} />
                    </div>
                    <div>
                      <label className={labelCls}>Job title</label>
                      <input className={inputCls} placeholder="Head of Operations" value={form.title} onChange={set('title')} />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Industry *</label>
                      <select required className={`${inputCls} appearance-none cursor-pointer`} value={form.industry} onChange={set('industry')}>
                        <option value="">Select your industry</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Team size</label>
                      <select className={`${inputCls} appearance-none cursor-pointer`} value={form.teamSize} onChange={set('teamSize')}>
                        <option value="">Select team size</option>
                        {SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>What are you hoping to solve? <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
                    <textarea
                      rows={4}
                      className={`${inputCls} resize-none`}
                      placeholder="Tell us about your current challenges — what data, what questions, what team?"
                      value={form.message}
                      onChange={set('message')}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[16px] rounded-xl transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                    ) : (
                      'Request My Demo →'
                    )}
                  </button>

                  <p className="text-[12.5px] text-gray-400 text-center">
                    We'll reach out within one business day. No spam, ever.
                  </p>
                </form>
              )}
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="space-y-6 lg:sticky lg:top-24"
            >
              {/* What to expect */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4">What to expect</h3>
                <ul className="space-y-3.5">
                  {[
                    ['30-minute live demo', 'Personalised to your industry and use case.'],
                    ['Connect your database', 'We\'ll show Zevra working on real data — yours or our sandbox.'],
                    ['Q&A with our team', 'Ask anything. Get straight answers.'],
                    ['Next steps', 'A 14-day trial with full access. No credit card needed.'],
                  ].map(([title, desc]) => (
                    <li key={title} className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={12} className="text-emerald-700" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800">{title}</p>
                        <p className="text-[12.5px] text-gray-500 leading-snug">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Proof points */}
              <div className="bg-[#080A0F] rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-brand to-emerald-400 flex items-center justify-center">
                    <Zap size={13} className="text-white fill-white" />
                  </div>
                  <span className="text-[14px] font-bold text-white">Zevra</span>
                </div>
                {PROOF.map((p) => (
                  <div key={p} className="flex items-center gap-2.5 text-[13px] text-zinc-400">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    {p}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
