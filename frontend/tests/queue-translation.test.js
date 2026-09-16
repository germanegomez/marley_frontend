import assert from 'node:assert/strict'
import { test } from 'node:test'
import { queueTranslation, setTranslatedMessages } from '../src/translation.js'

test('queue labels and announcements use their Frappe context', () => {
	setTranslatedMessages({
		'Select the Queues:Marley Frontend Queue': 'Seleccionar colas',
		'Token Number {0} to {1}:Marley Frontend Queue':
			'Turno número {0} a {1}',
	})
	assert.equal(queueTranslation('Select the Queues'), 'Seleccionar colas')
	assert.equal(
		queueTranslation('Token Number {0} to {1}', 12, 'Consultorio A'),
		'Turno número 12 a Consultorio A',
	)
	assert.equal(queueTranslation('Unknown'), 'Unknown')
})
