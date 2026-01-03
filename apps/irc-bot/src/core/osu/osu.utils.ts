export const osuRequestBody = (body: Record<string, string | number>) => {
  const searchParams = new URLSearchParams();

  Object.entries(body).forEach(([key, value]) => {
    searchParams.append(key, value.toString());
  });

  return searchParams.toString();
};

export const isError = <T>(response: T) => {
  const { error } = response as unknown as { error: unknown };
  return !!error;
};
