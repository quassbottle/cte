<script lang="ts">
	import Banner from '$lib/components/banner/banner.svelte';
	import Group from '$lib/components/group/group.svelte';
	import TabContentItem from '$lib/components/tabGroup/tabContentItem.svelte';
	import TabGroup from '$lib/components/tabGroup/tabGroup.svelte';
	import TabHead from '$lib/components/tabGroup/tabHead.svelte';
	import TabHeadItem from '$lib/components/tabGroup/tabHeadItem.svelte';

	let activeTabValue = 1;
	const handleClick = (tabValue: number) => () => {
		activeTabValue = tabValue;
	};
</script>

<div class="flex flex-col gap-16">
	<Banner class="bg-[#2c2c2c] text-white" let:Title let:Description>
		<Title>Banner Title</Title>
		<Description>Banner Description</Description>
	</Banner>

	<Group let:Title let:Content>
		<Title>Test</Title>
		<Content>Hello, world!</Content>
	</Group>

	<TabGroup let:Head let:ContentItem>
		<Head let:Item>
			<Item>Tab 1</Item>
			<Item>Tab 2</Item>
			<Item>Tab 3</Item>
		</Head>

		<ContentItem>Tab 1 content</ContentItem>
		<ContentItem>Tab 2 content</ContentItem>
		<ContentItem>Tab 3 content</ContentItem>
	</TabGroup>
</div>
