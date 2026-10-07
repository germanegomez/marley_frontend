const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

function pad(number) {
	return String(number).padStart(2, '0')
}

export function getLocalDateValue(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatAppointmentFilterDate(
	value,
	formatDate,
	translate = (message) => message,
	today = getLocalDateValue(),
) {
	if (!value) return ''

	const match = String(value).match(DATE_ONLY_PATTERN)
	if (!match || typeof formatDate !== 'function') return ''

	const [, year, month, day] = match
	const technicalDate = `${year}-${month}-${day}`
	const visibleDate = formatDate(technicalDate)
	if (!visibleDate) return ''

	if (technicalDate === today) {
		return translate('Today · {0}', visibleDate)
	}
	return visibleDate
}

export function appointmentSortOptions(translate = (message) => message) {
	return [
		{ label: translate('Time'), value: 'Appointment Time' },
		{ label: translate('Check-in'), value: 'Checkin Time' },
	]
}
