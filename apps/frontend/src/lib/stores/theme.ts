/**
 * Theme store — three-mode ('light' | 'dark' | 'system') with cookie
 * persistence and SSR-friendly behaviour.
 *
 * On the server the inline script in `app.html` already applied the correct
 * `.dark` class before the page painted. This store just mirrors that state
 * on the client, exposes `toggle()`, and persists the explicit user choice
 * via cookie so it survives refreshes and works on first paint next time.
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemePreference = 'light' | 'dark' | 'system';

const COOKIE_NAME = 'theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(): ThemePreference | null {
	if (!browser) return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
	if (!match) return null;
	const value = decodeURIComponent(match[1]);
	return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

function writeCookie(value: ThemePreference): void {
	if (!browser) return;
	document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function systemPrefersDark(): boolean {
	if (!browser) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
	if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
	return preference;
}

function applyDark(isDark: boolean): void {
	if (!browser) return;
	document.documentElement.classList.toggle('dark', isDark);
}

function initPreference(): ThemePreference {
	const stored = readCookie();
	if (stored) return stored;
	return 'system';
}

const initialPreference = initPreference();

export const themePreference = writable<ThemePreference>(initialPreference);
export const resolvedTheme = writable<'light' | 'dark'>(resolveTheme(initialPreference));

if (browser) {
	applyDark(resolveTheme(initialPreference) === 'dark');

	themePreference.subscribe((value) => {
		const resolved = resolveTheme(value);
		writeCookie(value);
		applyDark(resolved === 'dark');
		resolvedTheme.set(resolved);
	});

	if (systemPrefersDark() !== undefined) {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', () => {
			const current = get(themePreference);
			if (current === 'system') {
				resolvedTheme.set(mq.matches ? 'dark' : 'light');
				applyDark(mq.matches);
			}
		});
	}
}

/**
 * Cycles the user preference: light → dark → system → light.
 * More discoverable than a binary toggle for the three-mode setup.
 */
export function cycleTheme(): void {
	const current = get(themePreference);
	const next =
		current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
	themePreference.set(next);
}

/**
 * Binary toggle between light and dark. If the current preference is
 * `system`, switches to the explicit opposite of the resolved theme.
 */
export function toggleTheme(): void {
	const currentResolved = get(resolvedTheme);
	themePreference.set(currentResolved === 'dark' ? 'light' : 'dark');
}