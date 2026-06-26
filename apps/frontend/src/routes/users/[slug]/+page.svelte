<script lang="ts">
	import Banner from '$lib/components/banner/banner.svelte';
	import Group from '$lib/components/group/group.svelte';
	import { AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: user = data.user;
</script>

<svelte:head>
	<title>CTE - {user ? `${user.osuUsername}'s profile` : 'Profile'}</title>
</svelte:head>

{#if user}
	<Group let:Title let:Content>
		<Title class="text-[24px]">Player info</Title>
		<Content>
			<div
				class="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card pb-[100px] text-card-foreground"
			>
				<Banner src={user.osuCoverUrl} class="rounded-none bg-muted" />

				<div class="absolute bottom-4 flex w-full flex-row items-end gap-4 px-8">
					<Avatar class="h-[128px] w-[128px] rounded-[24px]">
						<AvatarImage src={user.avatarUrl} />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>

					<div class="flex flex-col pb-7">
						<p class="text-[24px] font-semibold leading-tight">{user.osuUsername}</p>
						<a
							class="text-[14px] text-muted-foreground underline transition hover:text-card-foreground"
							href="https://osu.ppy.sh/u/{user.osuId}"
							target="_blank"
							rel="noreferrer noopener"
						>
							osu! profile
						</a>
					</div>
				</div>
			</div>
		</Content>
	</Group>
{/if}
