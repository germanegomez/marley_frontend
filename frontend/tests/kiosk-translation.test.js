import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	kioskCatalogMessage,
	kioskTranslation,
	setTranslatedMessages,
} from '../src/translation.js'

test('kiosk keeps English and existing Arabic while using Frappe for the selected site language', () => {
	globalThis.window = { language: 'es' }
	setTranslatedMessages({
		'Enter Mobile number:Marley Frontend Kiosk': 'Ingresar número de celular',
		'Welcome {0}:Marley Frontend Kiosk': 'Bienvenido, {0}',
	})
	const catalog = {
		en: { placeholder: 'Enter Mobile number' },
		ar: { placeholder: 'أدخل رقم الجوال' },
	}
	try {
		assert.equal(kioskCatalogMessage(catalog, 'en', 'placeholder'), 'Enter Mobile number')
		assert.equal(kioskCatalogMessage(catalog, 'ar', 'placeholder'), 'أدخل رقم الجوال')
		assert.equal(kioskCatalogMessage(catalog, 'es', 'placeholder'), 'Ingresar número de celular')
		assert.equal(
			kioskCatalogMessage({
				placeholder: { en: 'Enter Mobile number', ar: 'أدخل رقم الجوال' },
			}, 'es', 'placeholder'),
			'Ingresar número de celular',
		)
		assert.equal(kioskTranslation('Welcome {0}', 'es', 'Ana'), 'Bienvenido, Ana')
		assert.equal(kioskTranslation('Welcome {0}', 'en', 'Ana'), 'Welcome Ana')
	} finally {
		delete globalThis.window
	}
})
