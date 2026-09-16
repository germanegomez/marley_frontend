import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	availableKioskLanguages,
	initialKioskLanguage,
	kioskTranslation,
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

test('Clinic Spanish works for a guest whose site language is English', () => {
	const previousWindow = globalThis.window
	try {
		globalThis.window = {
			language: 'en',
			clinic_kiosk_languages: ['en', 'es'],
			clinic_kiosk_translations: {
				'Enter Mobile number:Marley Frontend Kiosk': 'Ingresá el número de celular',
				'Hello {0}!:Marley Frontend Kiosk': '¡Hola {0}!',
			},
		}
		assert.equal(kioskTranslation('Enter Mobile number', 'es'), 'Ingresá el número de celular')
		assert.equal(kioskTranslation('Hello {0}!', 'es', 'Ana'), '¡Hola Ana!')
		assert.equal(kioskTranslation('Enter Mobile number', 'en'), 'Enter Mobile number')
	} finally {
		if (previousWindow === undefined) delete globalThis.window
		else globalThis.window = previousWindow
	}
})
