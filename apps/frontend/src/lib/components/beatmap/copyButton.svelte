<script lang="ts">
	import { onDestroy } from 'svelte';

	type CopyButtonProps = {
		label: string;
		value: string;
		class?: string;
		copiedLabel?: string;
		failedLabel?: string;
	};

	const {
		label,
		value,
		class: className,
		copiedLabel = 'Copied',
		failedLabel = 'Copy failed'
	}: CopyButtonProps = $props();

	let state = $state<'idle' | 'copied' | 'failed'>('idle');
	let resetTimeout: ReturnType<typeof setTimeout> | null = null;

	const resetStateLater = () => {
		if (resetTimeout) {
			clearTimeout(resetTimeout);
		}

		resetTimeout = setTimeout(() => {
			state = 'idle';
			resetTimeout = null;
		}, 1200);
	};

	const copyToClipboard = async (text: string) => {
		if (typeof document === 'undefined' || typeof navigator === 'undefined') {
			return false;
		}

		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch (error) {
				console.error('Clipboard write failed, trying fallback', error);
			}
		}

		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		textarea.style.pointerEvents = 'none';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();

		let copied = false;
		try {
			copied = document.execCommand('copy');
		} catch (error) {
			console.error('Fallback copy failed', error);
			copied = false;
		}

		document.body.removeChild(textarea);
		return copied;
	};

	const onCopy = async () => {
		const copied = await copyToClipboard(value);
		state = copied ? 'copied' : 'failed';
		resetStateLater();
	};

	onDestroy(() => {
		if (resetTimeout) {
			clearTimeout(resetTimeout);
		}
	});
</script>

<button
	type="button"
	class={`rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent ${className ?? ''}`}
	onclick={onCopy}
>
	{state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label}
</button>
