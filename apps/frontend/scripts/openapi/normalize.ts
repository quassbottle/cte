type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeValue = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(normalizeValue);
	}

	if (!isJsonObject(value)) {
		return value;
	}

	const normalized = Object.fromEntries(
		Object.entries(value).map(([key, nestedValue]) => [key, normalizeValue(nestedValue)])
	);

	if (typeof normalized.exclusiveMinimum === 'number') {
		normalized.minimum = normalized.exclusiveMinimum;
		normalized.exclusiveMinimum = true;
	}

	if (typeof normalized.exclusiveMaximum === 'number') {
		normalized.maximum = normalized.exclusiveMaximum;
		normalized.exclusiveMaximum = true;
	}

	return normalized;
};

export const normalizeOpenApiDocument = <T>(document: T): T => normalizeValue(document) as T;
