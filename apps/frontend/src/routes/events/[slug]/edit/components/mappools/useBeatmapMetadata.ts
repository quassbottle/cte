import { osuBeatmapMetadataSchema, type OsuBeatmapMetadata } from '$lib/schemas/osu.schema';
import { writable } from 'svelte/store';

type BeatmapMetadataState =
	| { status: 'idle'; metadata: null; message: null }
	| { status: 'loading'; metadata: null; message: null }
	| { status: 'loaded'; metadata: OsuBeatmapMetadata; message: null }
	| { status: 'error'; metadata: null; message: string };

export function createBeatmapMetadataLookup() {
	const state = writable<BeatmapMetadataState>({ status: 'idle', metadata: null, message: null });
	let controller: AbortController | null = null;
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

	const reset = () => {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
			debounceTimeout = null;
		}
		controller?.abort();
		controller = null;
		state.set({ status: 'idle', metadata: null, message: null });
	};

	const loadNow = async (beatmapIdValue: string) => {
		const beatmapId = Number.parseInt(beatmapIdValue, 10);

		if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
			state.set({ status: 'idle', metadata: null, message: null });
			return;
		}

		controller?.abort();
		controller = new AbortController();
		state.set({ status: 'loading', metadata: null, message: null });

		try {
			const response = await fetch(`/api/osu/beatmaps/${beatmapId}`, {
				signal: controller.signal
			});

			if (!response.ok) {
				state.set({
					status: 'error',
					metadata: null,
					message: response.status === 404 ? 'Beatmap not found' : 'Failed to load beatmap metadata'
				});
				return;
			}

			const parsed = osuBeatmapMetadataSchema.safeParse(await response.json());
			if (!parsed.success) {
				state.set({
					status: 'error',
					metadata: null,
					message: 'Invalid beatmap metadata response'
				});
				return;
			}

			state.set({ status: 'loaded', metadata: parsed.data, message: null });
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') {
				return;
			}

			state.set({
				status: 'error',
				metadata: null,
				message: 'Failed to load beatmap metadata'
			});
		}
	};

	const setBeatmapId = (beatmapIdValue: string) => {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		controller?.abort();

		const beatmapId = Number.parseInt(beatmapIdValue, 10);
		if (!Number.isInteger(beatmapId) || beatmapId <= 0) {
			state.set({ status: 'idle', metadata: null, message: null });
			return;
		}

		state.set({ status: 'loading', metadata: null, message: null });
		debounceTimeout = setTimeout(() => {
			debounceTimeout = null;
			void loadNow(beatmapIdValue);
		}, 350);
	};

	return { state, setBeatmapId, reset };
}
