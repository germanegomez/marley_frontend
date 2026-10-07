<template>
	<fieldset
		class="grid flex-1 grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[repeat(9,minmax(0,1fr))]"
		:disabled="props.disabled"
	>
		<legend class="sr-only">{{ t('Appointments and admissions filters') }}</legend>

		<AccessibleFilterAutocomplete
			id="appointment-filter"
			v-model="search"
			:options="props.searchOptions"
			:label="t('Appointment number')"
			:placeholder="t('Appointment number')"
			:accessible-label="t('Appointment identifier')"
			:disabled="props.disabled"
		/>

		<AccessibleFilterAutocomplete
			id="patient-filter"
			v-model="patientSearch"
			:options="patientSearchOptions"
			:label="t('Patient')"
			:placeholder="t('Patient')"
			:accessible-label="t('Patient Name')"
			:disabled="props.disabled"
		>
			<template #item-prefix="{ option }">
				<img :src="option.image.toString()" class="h-4 w-4 rounded-full" alt="">
			</template>
		</AccessibleFilterAutocomplete>

		<FormControl
			v-model="mobileSearch"
			type="tel"
			inputmode="tel"
			:label="t('Phone')"
			:placeholder="t('Phone')"
			:aria-label="t('Patient phone number')"
			:title="t('Patient phone number')"
			:disabled="props.disabled"
			size="sm"
			variant="subtle"
		/>

		<AccessibleFilterAutocomplete
			id="specialty-filter"
			v-model="department"
			:options="departmentOptions"
			:label="t('Specialty')"
			:placeholder="t('Specialty')"
			:accessible-label="t('Medical specialty')"
			:disabled="props.disabled"
		/>

		<div class="min-w-0">
			<label for="date-filter" class="mb-1 block text-xs font-medium text-ink-gray-6">
				{{ t('Date') }}
			</label>
			<DatePicker v-model="dateValue" :disabled="props.disabled">
				<template #target="{ togglePopover, isOpen }">
					<button
						id="date-filter"
						type="button"
						class="flex h-7 w-full items-center justify-between gap-2 rounded border border-transparent bg-surface-gray-2 px-2 py-1 text-left transition-colors hover:bg-surface-gray-3 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3 disabled:cursor-not-allowed disabled:bg-surface-gray-3"
						:aria-label="t('Appointment Date')"
						:title="t('Appointment Date')"
						:aria-expanded="isOpen"
						:disabled="props.disabled"
						aria-haspopup="dialog"
						@click="togglePopover"
					>
						<span class="flex min-w-0 items-center gap-2">
							<FeatherIcon name="calendar" class="h-4 w-4 shrink-0 text-ink-gray-5" aria-hidden="true" />
							<span class="truncate text-base leading-5 text-ink-gray-8">
								{{ formattedDate || t('Date') }}
							</span>
						</span>
						<FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-ink-gray-5" aria-hidden="true" />
					</button>
				</template>
			</DatePicker>
		</div>

		<AccessibleFilterAutocomplete
			id="practitioner-filter"
			v-model="practitioner"
			:options="practitionerOptions"
			:label="t('Practitioner short')"
			:placeholder="t('Practitioner short')"
			:accessible-label="t('Practitioner')"
			:multiple="true"
			:disabled="props.disabled"
		>
			<template #item-prefix="{ option }">
				<img :src="option.image.toString()" class="h-4 w-4 rounded-full" alt="">
			</template>
		</AccessibleFilterAutocomplete>

		<AccessibleFilterAutocomplete
			id="type-filter"
			v-model="visitType"
			:options="visitypeOptions"
			:label="t('Type')"
			:placeholder="t('Type')"
			:accessible-label="t('Appointment type')"
			:disabled="props.disabled"
		/>

		<FormControl
			v-model="sort_by"
			type="select"
			:options="appointmentSortOptions(t)"
			:label="t('Time')"
			:placeholder="t('Time')"
			:aria-label="t('Sort appointments by time')"
			:title="t('Sort appointments by time')"
			:disabled="props.disabled"
			size="sm"
		/>

		<div class="flex min-w-0 items-end">
			<Button
				class="w-full"
				:ref_for="true"
				theme="gray"
				size="sm"
				:label="t('Clear Filters')"
				:aria-label="t('Clear Filters')"
				:disabled="props.disabled"
				@click="clear_filters()"
			>
				<template #prefix>
					<FeatherIcon name="x" class="h-4 w-4" aria-hidden="true" />
				</template>
			</Button>
		</div>
	</fieldset>
</template>

<script setup>
	import { computed, ref } from 'vue'
	import { createResource, FormControl, DatePicker } from 'frappe-ui'
	import AccessibleFilterAutocomplete from '@/components/AccessibleFilterAutocomplete.vue'
	import { appointmentDeskTranslation as t } from '@/translation'
	import { getFormat } from '@/utils'
	import {
		appointmentSortOptions,
		formatAppointmentFilterDate,
		getLocalDateValue,
	} from '@/appointmentFilters'

	const props = defineProps({
		searchOptions: {
			type: Array,
			default: () => [],
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	})

	const search = defineModel('search')
	const patientSearch = defineModel('patient_search')
	const mobileSearch = defineModel('mobile_search')
	const department = defineModel('department')
	const dateValue = defineModel('dateValue')
	const practitioner = defineModel('practitioner')
	const visitType = defineModel('visitType')
	const sort_by = defineModel('sort_by')
	const patientSearchOptions = ref([])
	const practitionerOptions = ref([])
	const departmentOptions = ref([])
	const visitypeOptions = ref([])
	const formattedDate = computed(() =>
		formatAppointmentFilterDate(
			dateValue.value,
			(date) => getFormat(date, '', true),
			t,
		),
	)

	let patients = createResource({
		url: '/api/method/marley_frontend.waitlist.get_patients',
		method: 'GET',
		onSuccess(response) {
			patientSearchOptions.value = response.patients
		},
		onError() {
			error_dialog.value = true
		},
	})
	patients.fetch()

	const { fetch } = createResource({
		url: '/api/method/marley_frontend.waitlist.get_masters',
		method: 'GET',
		onSuccess(response) {
			practitionerOptions.value = response.practitioners
			departmentOptions.value = response.departments
		},
		onError: (error) => {
			dialog_message = error.messages?.[0] || error
			dialog_title = t('Fetching Masters Failed')
			error_dialog.value = true
		},
	})
	fetch()

	let get_types = createResource({
		url: '/api/method/marley_frontend.waitlist.get_appointment_types',
		method: 'GET',
		onSuccess(response) {
			visitypeOptions.value = response
		},
	})
	get_types.fetch()

	function clear_filters() {
		search.value = {}
		patientSearch.value = {}
		mobileSearch.value = ''
		department.value = {}
		dateValue.value = getLocalDateValue()
		practitioner.value = null
		visitType.value = {}
		sort_by.value = 'Appointment Time'
	}
</script>
