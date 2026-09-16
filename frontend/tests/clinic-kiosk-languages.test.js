import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	availableKioskLanguages,
	initialKioskLanguage,
} from '../src/translation.js'

test('Clinic limits kiosk choices to English and Spanish without changing upstream defaults', () => {
	const previousWindow = globalThis.window
	const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
	let saved = 'ar'
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: { getItem: () => saved },
	})
	try {
		globalThis.window = { language: 'es', clinic_kiosk_languages: ['en', 'es'] }
		assert.deepEqual(availableKioskLanguages(), ['en', 'es'])
		assert.equal(initialKioskLanguage(), 'es')
		saved = 'en'
		assert.equal(initialKioskLanguage(), 'en')
		delete globalThis.window.clinic_kiosk_languages
		assert.deepEqual(availableKioskLanguages(), ['en', 'ar', 'ml'])
	} finally {
		if (previousWindow === undefined) delete globalThis.window
		else globalThis.window = previousWindow
		if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
		else delete globalThis.localStorage
	}
})
