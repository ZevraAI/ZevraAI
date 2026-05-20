const INDUSTRIES = [
  'Healthcare', 'Hospitality', 'Logistics', 'Financial Services',
  'Retail', 'Manufacturing', 'Real Estate', 'Energy', 'Pharma',
  'Education', 'Insurance', 'Government',
];

const Track = () => (
  <div className="flex animate-marquee">
    {[...INDUSTRIES, ...INDUSTRIES].map((name, i) => (
      <div key={i} className="flex items-center gap-3 px-10 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
        <span className="text-[13px] font-medium text-zinc-500 whitespace-nowrap">{name}</span>
      </div>
    ))}
  </div>
);

export default function TrustBar() {
  return (
    <div className="border-y border-white/[0.06] bg-[#0a0c10] overflow-hidden py-5">
      <p className="text-center text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-600 mb-4">
        Built for every industry
      </p>
      <div className="overflow-hidden flex">
        <Track />
      </div>
    </div>
  );
}
