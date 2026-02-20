<script lang="ts">
	import Banner from '$lib/components/banner/banner.svelte';
	import Group from '$lib/components/group/group.svelte';
	import { AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import { getAvatarUrlByOsuId } from '$lib/utils/osu';
	import type { PageData } from './$types';

	export let data: PageData;

	$: user = data.user;
</script>

{#if user}
	<Group let:Title let:Content>
		<Title class="text-[24px]">Player info</Title>
		<Content>
			<div
				class="relative flex flex-col overflow-hidden rounded-2xl bg-primary pb-[100px] text-white"
			>
				<Banner class="rounded-none bg-[#2c2c2c]" />

				<div class="absolute bottom-4 flex w-full flex-row items-end gap-4">
					<Avatar class="ml-8 h-[128px] w-[128px] rounded-[24px]">
						<AvatarImage src={getAvatarUrlByOsuId(user.osuId)} />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>

					<div class="flex flex-col">
						<p class="-translate-y-8 self-end text-[24px] font-semibold">{user.username}</p>
					</div>
				</div>
			</div>
		</Content>
	</Group>
{/if}
