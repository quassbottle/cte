<script lang="ts">
	import { cn } from '$lib/utils';

	const { mod, index = null, class: className }: { mod: string; index?: number | null; class?: string } =
		$props();
	const getNormalizedMod = () => mod.trim().toUpperCase();

	const variants: {
		[mod: string]: string;
	} = {
		NM: 'bg-cyan-400',
		HD: 'bg-amber-400',
		HR: 'bg-red-400',
		DT: 'bg-blue-400',
		FM: 'bg-yellow-400',
		TB: 'bg-orange-400'
	} as const;
</script>

<span
	class={cn(
		'w-16 rounded-xl text-center  font-semibold text-neutral-800 select-none',
		variants[getNormalizedMod()] ?? 'bg-zinc-300',
		className
	)}>{getNormalizedMod()}{index !== null ? index : ''}</span
>
