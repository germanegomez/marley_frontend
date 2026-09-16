const TRANSLATIONS_URL = '/api/method/marley_frontend.www.healthcare.get_translations'
const TRANSLATION_LOAD_TIMEOUT = 10000
const APPOINTMENT_DESK_CONTEXT = 'Marley Frontend Appointment Desk'

let translatedMessages = {}

export function setTranslatedMessages(messages) {
	translatedMessages = messages && typeof messages === 'object' ? messages : {}
}

export function translate(message, replacements = [], context = null) {
	if (typeof message !== 'string') return message
	const key = context ? `${message}:${context}` : message
	const translated = translatedMessages[key] ?? translatedMessages[message] ?? message
	return translated.replace(/\{(\d+)\}/g, (placeholder, index) => {
		return replacements[Number(index)] ?? placeholder
	})
}

export function appointmentDeskTranslation(message, ...replacements) {
	return translate(message, replacements, APPOINTMENT_DESK_CONTEXT)
}

export async function loadTranslations({ fetcher = fetch, timeout = TRANSLATION_LOAD_TIMEOUT } = {}) {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeout)
	try {
		const response = await fetcher(TRANSLATIONS_URL, {
			credentials: 'same-origin',
			signal: controller.signal,
		})
		if (!response.ok) throw new Error(`Translation request failed: ${response.status}`)
		const payload = await response.json()
		setTranslatedMessages(payload.message)
	} catch (error) {
		console.warn('Unable to load translations; using source messages.', error)
		setTranslatedMessages({})
	} finally {
		clearTimeout(timeoutId)
	}
}

export default function translationPlugin(app) {
	app.config.globalProperties.__ = translate
	window.__ = translate
}
