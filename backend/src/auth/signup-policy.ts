// Shared with the registration form so browser guidance matches server validation.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_PATTERN = /^(?=[\s\S]*[a-z])(?=[\s\S]*[A-Z])(?=[\s\S]*\d)(?=[\s\S]*[^\p{L}\p{N}\s])[\s\S]*$/u;
export const PASSWORD_HELP = 'Use 8–128 characters, including an uppercase letter (A–Z), a lowercase letter (a–z), a number and a symbol (for example !, # or -).';
export const NAME_PATTERN = /^[\p{L}\p{M}\s.'’\-]+$/u;
export const NAME_HELP = 'Use letters, spaces, periods, hyphens or apostrophes.';
export const trimText = (value: unknown) => typeof value === 'string' ? value.trim() : value;
