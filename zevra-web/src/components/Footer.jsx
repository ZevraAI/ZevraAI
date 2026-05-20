import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { APP_URL } from '../lib/config';

const LINKS = {
  Product: [
    { label: 'Natural Language Q&A', href: '/#features' },
    { label: 'Knowledge Graph', href: '/#features' },
    { label: 'Proactive Alerts', href: '/#features' },
    { label: 'Scheduled Reports', href: '/#features' },
    { label: 'File Analysis', href: '/#features' },
  ],
  Solutions: [
    { label: 'Healthcare', href: '/#usecases' },
    { label: 'Hospitality', href: '/#usecases' },
    { label: 'Logistics', href: '/#usecases' },
    { label: 'Financial Services', href: '/#usecases' },
    { label: 'Manufacturing', href: '/#usecases' },
  ],
  Company: [
    { label: 'Security', href: '/#security' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Request Demo', href: '/demo' },
    { label: 'Launch App', href: APP_URL, external: true },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0c10] pt-14 pb-8">
      <div className="container-pad">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-emerald-brand to-emerald-400 flex items-center justify-center">
                <Zap size={15} className="text-white fill-white" />
              </div>
              <span className="text-[18px] font-black tracking-tight text-white">Zevra</span>
            </Link>
            <p className="text-[13.5px] text-zinc-500 leading-relaxed">
              Enterprise operational intelligence for any industry, any database, any team.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-zinc-600 mb-4">{group}</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noreferrer"
                        className="text-[13.5px] text-zinc-500 hover:text-white transition-colors">
                        {item.label} ↗
                      </a>
                    ) : item.href.startsWith('/') && !item.href.startsWith('/#') ? (
                      <Link to={item.href} className="text-[13.5px] text-zinc-500 hover:text-white transition-colors">
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} className="text-[13.5px] text-zinc-500 hover:text-white transition-colors">
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.06] pt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[13px] text-zinc-600">© 2026 Zevra, Inc. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((l) => (
              <a key={l} href="#" className="text-[13px] text-zinc-600 hover:text-zinc-300 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
