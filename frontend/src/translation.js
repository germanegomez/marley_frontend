const TRANSLATIONS_URL = '/api/method/marley_frontend.www.healthcare.get_translations'
const TRANSLATION_LOAD_TIMEOUT = 10000
const APPOINTMENT_DESK_CONTEXT = 'Marley Frontend Appointment Desk'
const QUEUE_CONTEXT = 'Marley Frontend Queue'
const BED_MANAGEMENT_CONTEXT = 'Marley Frontend Bed Management'
const KIOSK_CONTEXT = 'Marley Frontend Kiosk'
const DEFAULT_KIOSK_LANGUAGES = ['en', 'ar', 'ml']

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

export function queueTranslation(message, ...replacements) {
	return translate(message, replacements, QUEUE_CONTEXT)
}

export function bedManagementTranslation(message, ...replacements) {
	return translate(message, replacements, BED_MANAGEMENT_CONTEXT)
}

export function kioskTranslation(message, language = 'en', ...replacements) {
	const selected = language?.toLowerCase().split('-')[0]
	const effective = globalThis.window?.language?.toLowerCase().split('-')[0]
	if (selected && selected !== 'en' && selected === effective) {
		return translate(message, replacements, KIOSK_CONTEXT)
	}
	return message.replace(/\{(\d+)\}/g, (placeholder, index) =>
		replacements[Number(index)] ?? placeholder
	)
}

export function kioskCatalogMessage(catalog, language, key) {
	const source = catalog.en?.[key] ?? catalog[key]?.en
	const existing = catalog[language]?.[key] ?? catalog[key]?.[language]
	return existing ?? kioskTranslation(source, language)
}

export function availableKioskLanguages() {
	const configured = globalThis.window?.clinic_kiosk_languages
	return Array.isArray(configured) && configured.length
		? configured
		: DEFAULT_KIOSK_LANGUAGES
}

export function initialKioskLanguage() {
	const available = availableKioskLanguages()
	const saved = globalThis.localStorage?.getItem('selectedLanguage')
	const effective = globalThis.window?.language?.toLowerCase().split('-')[0]
	return [saved, effective, 'en'].find(language => available.includes(language)) ?? available[0]
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
