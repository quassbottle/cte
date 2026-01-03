export function mpChannelToId(channel: string): number {
  if (!channel.startsWith('#mp_')) {
    throw new Error(`Invalid channel format: ${channel}`);
  }

  const id = Number(channel.slice(4));

  if (Number.isNaN(id)) {
    throw new TypeError(`Invalid channel id: ${channel}`);
  }

  return id;
}
