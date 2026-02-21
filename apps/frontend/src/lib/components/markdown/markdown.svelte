<script lang="ts">
	import DOMPurify from 'isomorphic-dompurify';
	import { marked } from 'marked';

	export let value: string | null | undefined = '';
	export let className = '';

	const markdownRenderer = new marked.Renderer();
	markdownRenderer.html = () => '';

	$: hasValue = Boolean(value?.trim());
	$: html = hasValue
		? DOMPurify.sanitize(
				marked.parse(value as string, {
					renderer: markdownRenderer,
					breaks: true,
					gfm: true
				}) as string
			)
		: '';
</script>

{#if hasValue}
	<div class={`prose max-w-none ${className}`}>{@html html}</div>
{/if}
