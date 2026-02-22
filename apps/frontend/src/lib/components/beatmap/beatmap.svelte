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
	let idCopyFailed = $state(false);
	let mpMapCopyFailed = $state(false);
	let idCopiedTimeout: ReturnType<typeof setTimeout> | null = null;
	let mpMapCopiedTimeout: ReturnType<typeof setTimeout> | null = null;
	let idCopyFailedTimeout: ReturnType<typeof setTimeout> | null = null;
	let mpMapCopyFailedTimeout: ReturnType<typeof setTimeout> | null = null;

	const showCopiedState = (type: 'id' | 'mp') => {
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

		mpMapCopyFailed = false;
		mpMapCopied = true;
		if (mpMapCopiedTimeout) {
			clearTimeout(mpMapCopiedTimeout);
		}
		mpMapCopiedTimeout = setTimeout(() => {
			mpMapCopied = false;
			mpMapCopiedTimeout = null;
		}, 1200);
	};

	const showCopyFailedState = (type: 'id' | 'mp') => {
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

		mpMapCopied = false;
		mpMapCopyFailed = true;
		if (mpMapCopyFailedTimeout) {
			clearTimeout(mpMapCopyFailedTimeout);
		}
		mpMapCopyFailedTimeout = setTimeout(() => {
			mpMapCopyFailed = false;
			mpMapCopyFailedTimeout = null;
		}, 1200);
	};

	const copyToClipboard = async (value: string) => {
		if (typeof window === 'undefined' || typeof navigator === 'undefined') {
			return false;
		}

		if (!window.isSecureContext) {
			console.error('Clipboard API unavailable: insecure context');
			return false;
		}

		if (!navigator.clipboard) {
			console.error('Clipboard API unavailable: navigator.clipboard is undefined');
			return false;
		}

		try {
			await navigator.clipboard.writeText(value);
			return true;
		} catch (error) {
			console.error('Clipboard write failed', error);
			return false;
		}
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
			showCopiedState('mp');
			return;
		}
		showCopyFailedState('mp');
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
		</div>
	</div>
</div>
