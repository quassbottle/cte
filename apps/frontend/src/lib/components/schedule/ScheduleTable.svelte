<section class="w-full overflow-hidden rounded-md border border-border">
	<div class="hidden overflow-x-auto md:block">
		<table class="w-full min-w-[900px] border-collapse text-sm">
			<slot name="header" />
			<slot name="rows" />
		</table>
	</div>

	<div class="divide-y divide-border md:hidden">
		<slot name="mobile" />
	</div>
</section>
