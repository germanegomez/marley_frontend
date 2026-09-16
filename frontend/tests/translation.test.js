import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	appointmentDeskTranslation,
	loadTranslations,
	setTranslatedMessages,
	translate,
} from '../src/translation.js'

test('uses contextual translations and substitutes positional placeholders', () => {
	setTranslatedMessages({
		'Appointment:Marley Frontend Appointment Desk': 'Turno',
		'All ({0}):Marley Frontend Appointment Desk': 'Todos ({0})',
	})
	assert.equal(appointmentDeskTranslation('Appointment'), 'Turno')
	assert.equal(appointmentDeskTranslation('All ({0})', 3), 'Todos (3)')
	assert.equal(translate('Unknown'), 'Unknown')
})

test('loads the Frappe dictionary before consumers use it', async () => {
	await loadTranslations({
		fetcher: async () => ({
			ok: true,
			json: async () => ({ message: { Appointment: 'Turno' } }),
		}),
	})
	assert.equal(translate('Appointment'), 'Turno')
})

test('falls back to source strings when the request fails', async () => {
	setTranslatedMessages({ Appointment: 'Turno' })
	const warning = console.warn
	console.warn = () => {}
	try {
		await loadTranslations({ fetcher: async () => { throw new Error('offline') } })
	} finally {
		console.warn = warning
	}
	assert.equal(translate('Appointment'), 'Appointment')
})
