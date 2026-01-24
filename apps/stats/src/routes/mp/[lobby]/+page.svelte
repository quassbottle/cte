<script lang="ts">
	import type { PageProps } from "./$types";

  const { data }: PageProps = $props()
</script>

<p>Lobby ID: {data.lobby}</p>