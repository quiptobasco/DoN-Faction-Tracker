export const getReputationLabel = (value: number): string => {
  if (value >= 1100) return 'Ally';
  if (value >= 750) return 'Warmly';
  if (value >= 500) return 'Kindly';
  if (value >= 100) return 'Amiably';
  if (value >= 0) return 'Indifferent';
  if (value >= -100) return 'Apprehensively';
  if (value >= -500) return 'Dubiously';
  if (value >= -750) return 'Threateningly';
  return 'Scowls (Ready to Attack)';
};

export const getReputationClasses = (value: number): string => {
  if (value >= 1100) return 'text-emerald-400 font-black stat-glow uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(52,211,153,0.2)]';
  if (value >= 750) return 'text-emerald-400 font-bold uppercase tracking-wider';
  if (value >= 500) return 'text-green-400 font-bold uppercase tracking-wide';
  if (value >= 100) return 'text-teal-400 font-medium uppercase tracking-normal';
  if (value >= 0) return 'text-slate-300 font-medium uppercase';
  if (value >= -100) return 'text-yellow-400 font-medium uppercase';
  if (value >= -500) return 'text-orange-400 font-medium uppercase';
  if (value >= -750) return 'text-orange-600 font-bold uppercase';
  return 'text-red-500 font-black uppercase tracking-tighter bg-red-900/20 px-2 py-0.5 rounded';
};
