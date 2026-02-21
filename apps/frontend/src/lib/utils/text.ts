export function capitalizeFirstLetter(val: string) {
	return val[0].toUpperCase() + val.slice(1);
}

export const pluralize = (word: string, count: number, pluralForm?: string): string => {
	count = Number(count);

	if (count === 1) return word;

	if (pluralForm) return pluralForm;

	if (/[^aeiou]y$/i.test(word)) {
		return word.replace(/y$/, 'ies');
	}

	if (/(s|sh|ch|x|z)$/i.test(word)) {
		return word + 'es';
	}

	if (/f$|fe$/i.test(word)) {
		return word.replace(/f$|fe$/, 'ves');
	}

	return word + 's';
};
