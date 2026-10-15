const MODEL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DISPLAY_DATE_PATTERN = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/

export function datePickerLocale(windowObject = globalThis.window) {
	return windowObject?.language
		|| windowObject?.document?.documentElement?.lang
		|| globalThis.navigator?.language
		|| 'en'
}

export function modelDate(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
	const year = String(date.getFullYear()).padStart(4, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function parseDate(value) {
	if (!value) return null
	const raw = String(value).trim()
	let match = raw.match(MODEL_DATE_PATTERN)
	if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]))
	match = raw.match(DISPLAY_DATE_PATTERN)
	if (match) return validDate(Number(match[3]), Number(match[2]), Number(match[1]))
	return null
}

export function calendarWeeks(year, month) {
	const first = new Date(year, month, 1)
	const start = new Date(year, month, 1 - first.getDay())
	return Array.from({ length: 6 }, (_, weekIndex) => (
		Array.from({ length: 7 }, (_, dayIndex) => {
			const date = new Date(start)
			date.setDate(start.getDate() + (weekIndex * 7) + dayIndex)
			return date
		})
	))
}

function validDate(year, month, day) {
	const date = new Date(year, month - 1, day)
	if (
		date.getFullYear() !== year
		|| date.getMonth() !== month - 1
		|| date.getDate() !== day
	) return null
	return date
}
