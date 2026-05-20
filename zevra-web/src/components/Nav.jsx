import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap } from 'lucide-react';
import { APP_URL } from '../lib/config';

const links = [
  { label: 'Product', href: '/#features' },
  { label: 'Use Cases', href: '/#usecases' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Security', href: '/#security' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isDemoPage = pathname === '/demo';

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleAnchor = (e, href) => {
    if (href.startsWith('/#') && pathname === '/') {
      e.preventDefault();
      const id = href.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 h-16 flex items-center transition-all duration-300 ${
          scrolled || isDemoPage
            ? 'bg-[#080A0F]/90 backdrop-blur-xl border-b border-white/[0.07]'
            : 'bg-transparent'
        }`}
      >
        <div className="container-pad w-full flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-emerald-brand to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Zap size={15} className="text-white fill-white" />
            </div>
            <span className="text-[19px] font-black tracking-tight text-white">Zevra</span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => handleAnchor(e, l.href)}
                className="px-3.5 py-2 text-[13.5px] font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <a
              href={APP_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[13.5px] font-medium text-zinc-400 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/[0.06] transition-all"
            >
              Log in
            </a>
            <Link
              to="/demo"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[13.5px] font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:-translate-y-px"
            >
              Request Demo
            </Link>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden ml-auto p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-16 z-40 bg-[#080A0F]/97 backdrop-blur-2xl border-b border-white/[0.07] px-6 pb-6 pt-3 md:hidden"
          >
            <nav className="flex flex-col gap-1 mb-5">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => handleAnchor(e, l.href)}
                  className="px-4 py-3 text-[15px] font-medium text-zinc-300 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-3">
              <a
                href={APP_URL}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-3 text-center text-[15px] font-medium text-zinc-300 border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all"
              >
                Log in to Zevra
              </a>
              <Link
                to="/demo"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-center text-[15px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all"
              >
                Request a Demo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
