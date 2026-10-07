import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
	appointmentSortOptions,
	formatAppointmentFilterDate,
	getLocalDateValue,
} from '../src/appointmentFilters.js'

test('delegates visible dates to the configured Frappe formatter', () => {
	const translate = (message, value) => message.replace('{0}', value)
	const receivedValues = []
	const formatDate = (value) => {
		receivedValues.push(value)
		return value === '2026-10-06' ? '06/10/2026' : '10-07-2026'
	}
	assert.equal(
		formatAppointmentFilterDate(
			'2026-10-06',
			formatDate,
			translate,
			'2026-10-06',
		),
		'Today · 06/10/2026',
	)
	assert.equal(
		formatAppointmentFilterDate(
			'2026-10-07',
			formatDate,
			translate,
			'2026-10-06',
		),
		'10-07-2026',
	)
	assert.deepEqual(receivedValues, ['2026-10-06', '2026-10-07'])
	assert.equal(formatAppointmentFilterDate('not-a-date', formatDate, translate), '')
	assert.equal(formatAppointmentFilterDate('2026-10-06'), '')
})

test('builds a local date-only backend value without a UTC conversion', () => {
	assert.equal(getLocalDateValue(new Date(2026, 9, 6, 23, 30)), '2026-10-06')
})

test('keeps the backend sort contract while shortening visible labels', () => {
	const labels = {
		Time: 'Hora',
		'Check-in': 'Ingreso',
	}
	assert.deepEqual(
		appointmentSortOptions((message) => labels[message]),
		[
			{ label: 'Hora', value: 'Appointment Time' },
			{ label: 'Ingreso', value: 'Checkin Time' },
		],
	)
})

test('declares compact, responsive and accessible filter controls', () => {
	const source = readFileSync(
		new URL('../src/components/SearchFilters.vue', import.meta.url),
		'utf8',
	)
	for (const label of [
		'Appointment number',
		'Patient',
		'Phone',
		'Specialty',
		'Date',
		'Practitioner short',
		'Type',
		'Time',
	]) {
		assert.match(source, new RegExp(`t\\('${label}'\\)`))
	}
	assert.match(source, /sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-\[repeat\(9,minmax\(0,1fr\)\)\]/)
	assert.match(source, /aria-label=/)
	assert.match(source, /<fieldset/)
	assert.match(source, /type="tel"/)
	assert.match(source, /getFormat\(date, '', true\)/)
})
