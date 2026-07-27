const variants: Record<string, string> = {
	XH: 'bg-fuchsia-600 text-slate-200',
	X: 'bg-fuchsia-600 text-amber-300',
	SH: 'bg-cyan-600 text-slate-200',
	S: 'bg-cyan-600 text-amber-300',
	A: 'bg-lime-500 text-lime-950',
	B: 'bg-amber-400 text-amber-950',
	C: 'bg-orange-400 text-orange-950',
	D: 'bg-red-500 text-red-950',
	F: 'bg-zinc-500 text-zinc-950'
};

export const getRankDisplay = (rank: string) => {
	const normalized = rank.trim().toUpperCase();
	return {
		label: normalized === 'X' || normalized === 'XH' ? 'SS' : normalized.replace(/H$/, ''),
		hidden: normalized === 'XH' || normalized === 'SH',
		className: variants[normalized] ?? 'bg-zinc-300 text-zinc-900'
	};
};
