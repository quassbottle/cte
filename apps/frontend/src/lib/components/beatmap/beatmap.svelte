<script lang="ts">
	import Banner from '../banner/banner.svelte';
	import Mod from '../mod/mod.svelte';
	import BreadcrumbList from '../ui/breadcrumbList/breadcrumbList.svelte';

	type BeatmapProps = {
		class?: string;
		artist: string;
		title: string;
		difficultyName: string;
		beatmapsetId: number;
		beatmapId: number;
		mod?: string;
		index?: number | null;
		difficulty?: number | null;
		deleted?: boolean;
	};

	const {
		artist,
		title,
		difficultyName,
		beatmapsetId,
		beatmapId,
		mod = 'NM',
		index = null,
		difficulty = null,
		deleted = false,
		class: className
	}: BeatmapProps = $props();

	let idCopied = $state(false);
	let mpMapCopied = $state(false);
	let mpModsCopied = $state(false);
	let idCopyFailed = $state(false);
	let mpMapCopyFailed = $state(false);
	let mpModsCopyFailed = $state(false);
	let idCopiedTimeout: ReturnType<typeof setTimeout> | null = null;
	let mpMapCopiedTimeout: ReturnType<typeof setTimeout> | null = null;
	let mpModsCopiedTimeout: ReturnType<typeof setTimeout> | null = null;
	let idCopyFailedTimeout: ReturnType<typeof setTimeout> | null = null;
	let mpMapCopyFailedTimeout: ReturnType<typeof setTimeout> | null = null;
	let mpModsCopyFailedTimeout: ReturnType<typeof setTimeout> | null = null;

	const showCopiedState = (type: 'id' | 'mpMap' | 'mpMods') => {
		if (type === 'id') {
			idCopyFailed = false;
			idCopied = true;
			if (idCopiedTimeout) {
				clearTimeout(idCopiedTimeout);
			}
			idCopiedTimeout = setTimeout(() => {
				idCopied = false;
				idCopiedTimeout = null;
			}, 1200);
			return;
		}

		if (type === 'mpMap') {
			mpMapCopyFailed = false;
			mpMapCopied = true;
			if (mpMapCopiedTimeout) {
				clearTimeout(mpMapCopiedTimeout);
			}
			mpMapCopiedTimeout = setTimeout(() => {
				mpMapCopied = false;
				mpMapCopiedTimeout = null;
			}, 1200);
			return;
		}

		mpModsCopyFailed = false;
		mpModsCopied = true;
		if (mpModsCopiedTimeout) {
			clearTimeout(mpModsCopiedTimeout);
		}
		mpModsCopiedTimeout = setTimeout(() => {
			mpModsCopied = false;
			mpModsCopiedTimeout = null;
		}, 1200);
	};

	const showCopyFailedState = (type: 'id' | 'mpMap' | 'mpMods') => {
		if (type === 'id') {
			idCopied = false;
			idCopyFailed = true;
			if (idCopyFailedTimeout) {
				clearTimeout(idCopyFailedTimeout);
			}
			idCopyFailedTimeout = setTimeout(() => {
				idCopyFailed = false;
				idCopyFailedTimeout = null;
			}, 1200);
			return;
		}

		if (type === 'mpMap') {
			mpMapCopied = false;
			mpMapCopyFailed = true;
			if (mpMapCopyFailedTimeout) {
				clearTimeout(mpMapCopyFailedTimeout);
			}
			mpMapCopyFailedTimeout = setTimeout(() => {
				mpMapCopyFailed = false;
				mpMapCopyFailedTimeout = null;
			}, 1200);
			return;
		}

		mpModsCopied = false;
		mpModsCopyFailed = true;
		if (mpModsCopyFailedTimeout) {
			clearTimeout(mpModsCopyFailedTimeout);
		}
		mpModsCopyFailedTimeout = setTimeout(() => {
			mpModsCopyFailed = false;
			mpModsCopyFailedTimeout = null;
		}, 1200);
	};

	const getMpModsCommand = (value: string): string => {
		const normalizedMod = value.trim().toUpperCase();
		const baseMod = normalizedMod.match(/^[A-Z]+/)?.[0] ?? normalizedMod;

		if (baseMod === 'FM' || baseMod === 'TB') {
			return '!mp mods freemod';
		}

		if (baseMod === 'HD' || baseMod === 'HR' || baseMod === 'DT' || baseMod === 'EZ') {
			return `!mp mods NF ${baseMod}`;
		}

		return '!mp mods NF';
	};

	const copyToClipboard = async (value: string) => {
		if (typeof document === 'undefined' || typeof navigator === 'undefined') {
			return false;
		}

		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(value);
				return true;
			} catch (error) {
				console.error('Clipboard write failed, trying fallback', error);
			}
		}

		const textarea = document.createElement('textarea');
		textarea.value = value;
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

	const onCopyId = async () => {
		const copied = await copyToClipboard(String(beatmapId));
		if (copied) {
			showCopiedState('id');
			return;
		}
		showCopyFailedState('id');
	};

	const onCopyMpMap = async () => {
		const copied = await copyToClipboard(`!mp map ${beatmapId}`);
		if (copied) {
			showCopiedState('mpMap');
			return;
		}
		showCopyFailedState('mpMap');
	};

	const onCopyMpMods = async () => {
		const copied = await copyToClipboard(getMpModsCommand(mod));
		if (copied) {
			showCopiedState('mpMods');
			return;
		}
		showCopyFailedState('mpMods');
	};
</script>

<div class="flex w-full flex-col overflow-hidden rounded-2xl bg-[#f5f5f5]">
	<Banner
		class="relative h-[120px] w-full"
		src={`https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg`}
	></Banner>

	<div class="relative flex flex-col gap-2 p-4 pr-72">
		<a class="text-[20px] font-semibold hover:underline" href={`https://osu.ppy.sh/b/${beatmapId}`}>
			{artist} - {title}
		</a>

		<BreadcrumbList let:Item>
			<Item>
				<div class="flex flex-row items-center gap-1 text-[12px]">
					{difficultyName}
				</div>
			</Item>
			{#if !deleted && difficulty !== null}
				<Item>
					<div class="flex flex-row items-center gap-1 text-[12px]">
						{difficulty} &#9733;
					</div>
				</Item>
			{/if}
		</BreadcrumbList>

		<Mod mod={mod} index={index} />

		<div class="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
			<a
				class="rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent"
				href={`osu://b/${beatmapId}`}
			>
				Direct
			</a>
			<button
				type="button"
				class="rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent"
				on:click={onCopyId}
			>
				{idCopied ? 'Copied' : idCopyFailed ? 'Copy failed' : 'Copy ID'}
			</button>
			<button
				type="button"
				class="rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent"
				on:click={onCopyMpMap}
			>
				{mpMapCopied ? 'Copied' : mpMapCopyFailed ? 'Copy failed' : 'Copy MP MAP'}
			</button>
			<button
				type="button"
				class="rounded-md border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-accent"
				on:click={onCopyMpMods}
			>
				{mpModsCopied ? 'Copied' : mpModsCopyFailed ? 'Copy failed' : 'Copy MP MODS'}
			</button>
		</div>
	</div>
</div>
