<script lang="ts">
	import { Github } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let className = '';
	export { className as class };
</script>

<div class={cn('flex items-center gap-3', className)}>
	<a
		class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		href="https://discord.gg/vtcQGafwR6"
		target="_blank"
		rel="noreferrer noopener"
		aria-label="Discord"
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M19.54 5.23A16.8 16.8 0 0 0 15.4 4c-.18.32-.39.75-.53 1.1a15.6 15.6 0 0 0-4.74 0c-.14-.35-.35-.78-.54-1.1-1.46.25-2.85.68-4.14 1.23C2.83 9.08 2.13 12.83 2.49 16.53A16.7 16.7 0 0 0 7.57 19.1c.41-.56.77-1.15 1.08-1.78-.59-.22-1.15-.49-1.68-.8.14-.1.28-.21.41-.32a12 12 0 0 0 10.24 0c.14.11.27.22.41.32-.53.31-1.09.58-1.68.8.31.63.67 1.22 1.08 1.78a16.6 16.6 0 0 0 5.08-2.57c.43-4.29-.73-8-2.97-11.3ZM8.68 14.25c-.99 0-1.8-.9-1.8-2.01 0-1.1.79-2.01 1.8-2.01s1.82.91 1.8 2.01c0 1.11-.8 2.01-1.8 2.01Zm6.64 0c-.99 0-1.8-.9-1.8-2.01 0-1.1.79-2.01 1.8-2.01s1.82.91 1.8 2.01c0 1.11-.79 2.01-1.8 2.01Z"
			/>
		</svg>
	</a>
	<a
		class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		href="https://github.com/quassbottle/cte"
		target="_blank"
		rel="noreferrer noopener"
		aria-label="GitHub"
	>
		<Github class="h-5 w-5" />
	</a>
</div>
