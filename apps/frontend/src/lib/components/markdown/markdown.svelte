<script lang="ts">
	import DOMPurify from 'isomorphic-dompurify';
	import { marked } from 'marked';

	export let value: string | null | undefined = '';
	export let className = '';

	const markdownRenderer = new marked.Renderer();
	markdownRenderer.html = () => '';

	$: normalizedValue = (value ?? '').replace(/\r\n/g, '\n');
	$: markdownValue =
		normalizedValue.includes('\n') || !normalizedValue.includes('\\n')
			? normalizedValue
			: normalizedValue.replace(/\\n/g, '\n');
	$: hasValue = Boolean(markdownValue.trim());
	$: html = hasValue
		? DOMPurify.sanitize(
				marked.parse(markdownValue, {
					renderer: markdownRenderer,
					breaks: true,
					gfm: true
				}) as string
			)
		: '';
</script>

{#if hasValue}
	<div
		class={`prose prose-neutral dark:prose-invert max-w-none
			prose-headings:mb-3 prose-headings:mt-6 prose-headings:first:mt-0
			prose-p:my-3 prose-p:leading-7
			prose-ol:my-3 prose-ol:pl-6 prose-ul:my-3 prose-ul:pl-6
			prose-li:my-1
			prose-hr:my-6
			${className}`}
	>
		{@html html}
	</div>
{/if}
