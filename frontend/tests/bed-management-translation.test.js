import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bedManagementTranslation, setTranslatedMessages } from '../src/translation.js'

test('bed management uses contextual labels and dynamic messages', () => {
	setTranslatedMessages({
		'Room Type:Marley Frontend Bed Management': 'Tipo de habitación',
		'Occupied:Marley Frontend Bed Management': 'Ocupada',
		'Room status changed to {0}:Marley Frontend Bed Management':
			'Estado de la habitación cambiado a {0}',
	})
	assert.equal(bedManagementTranslation('Room Type'), 'Tipo de habitación')
	assert.equal(bedManagementTranslation('Occupied'), 'Ocupada')
	assert.equal(
		bedManagementTranslation('Room status changed to {0}', 'Ocupada'),
		'Estado de la habitación cambiado a Ocupada',
	)
	assert.equal(bedManagementTranslation('Vacant'), 'Vacant')
})
