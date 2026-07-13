export const debounce = <Args extends unknown[]>(
	callback: (...args: Args) => void,
	delay: number
) => {
	let timeout: ReturnType<typeof setTimeout>;

	const run = (...args: Args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => callback(...args), delay);
	};

	run.cancel = () => clearTimeout(timeout);
	return run;
};
