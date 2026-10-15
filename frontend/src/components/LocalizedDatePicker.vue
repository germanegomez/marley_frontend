<template>
	<Popover
		class="inline-block w-full"
		:placement="placement"
		@open="initializeFromValue"
		@close="handleClose"
	>
		<template #target="{ togglePopover, isOpen }">
			<TextInput
				v-model="inputValue"
				type="text"
				class="w-full cursor-text"
				:class="inputClass"
				:variant="variant"
				:placeholder="placeholder"
				:disabled="disabled"
				:readonly="readonly || !allowCustom"
				@focus="activateInput(isOpen, togglePopover)"
				@click="activateInput(isOpen, togglePopover)"
				@blur="handleBlur"
				@keydown.enter.prevent="commitInput(true, togglePopover)"
			>
				<template #suffix>
					<FeatherIcon
						name="chevron-down"
						class="h-4 w-4 cursor-pointer"
						@mousedown.prevent="togglePopover"
					/>
				</template>
			</TextInput>
		</template>

		<template #body="{ togglePopover }">
			<div
				ref="popoverContent"
				class="mt-2 w-fit min-w-60 select-none rounded-lg bg-surface-modal text-base text-ink-gray-9 shadow-2xl ring-1 ring-black ring-opacity-5"
			>
				<div class="flex items-center justify-between gap-1 p-2 pb-0">
					<Button
						variant="ghost"
						size="sm"
						class="text-sm font-medium text-ink-gray-7"
						@click="cycleView"
					>
						<span v-if="view === 'date'">{{ monthNames[currentMonth] }} {{ currentYear }}</span>
						<span v-else-if="view === 'month'">{{ currentYear }}</span>
						<span v-else>{{ yearRangeStart }} - {{ yearRangeStart + 11 }}</span>
					</Button>
					<div class="flex items-center">
						<Button
							variant="ghost"
							icon="chevron-left"
							class="size-7"
							:aria-label="t('Previous month')"
							@click="previous"
						/>
						<Button
							variant="ghost"
							icon="chevron-right"
							class="size-7"
							:aria-label="t('Next month')"
							@click="next"
						/>
					</div>
				</div>

				<div class="p-2">
					<div v-if="view === 'date'" role="grid" :aria-label="t('Calendar dates')">
						<div class="mb-1 flex items-center text-xs font-medium uppercase text-ink-gray-4" role="row">
							<div
								v-for="weekday in weekdayNames"
								:key="weekday.long"
								class="flex h-6 w-8 items-center justify-center"
								role="columnheader"
								:aria-label="weekday.long"
							>
								{{ weekday.short }}
							</div>
						</div>
						<div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="flex" role="row">
							<button
								v-for="date in week"
								:key="modelDate(date)"
								type="button"
								class="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm focus:outline-none focus:ring-2 focus:ring-outline-gray-2"
								:class="dateClasses(date)"
								role="gridcell"
								:aria-selected="isSelected(date) ? 'true' : 'false'"
								:aria-label="dateAriaLabel(date)"
								@click="selectDate(date, togglePopover)"
							>
								{{ date.getDate() }}
							</button>
						</div>
					</div>

					<div v-else-if="view === 'month'" class="grid grid-cols-3 gap-1" role="grid" :aria-label="t('Select month')">
						<button
							v-for="(month, monthIndex) in monthNames"
							:key="month"
							type="button"
							class="cursor-pointer rounded py-2 text-center text-sm hover:bg-surface-gray-2 focus:outline-none focus:ring-2 focus:ring-brand-6"
							:class="{ 'bg-surface-gray-6 text-ink-white hover:bg-surface-gray-6': monthIndex === currentMonth }"
							:aria-selected="monthIndex === currentMonth ? 'true' : 'false'"
							@click="selectMonth(monthIndex)"
						>
							{{ month }}
						</button>
					</div>

					<div v-else class="grid grid-cols-3 gap-1" role="grid" :aria-label="t('Select year')">
						<button
							v-for="year in yearRange"
							:key="year"
							type="button"
							class="cursor-pointer rounded py-2 text-center text-sm hover:bg-surface-gray-2 focus:outline-none focus:ring-2 focus:ring-brand-6"
							:class="{ 'bg-surface-gray-6 text-ink-white hover:bg-surface-gray-6': year === currentYear }"
							:aria-selected="year === currentYear ? 'true' : 'false'"
							@click="selectYear(year)"
						>
							{{ year }}
						</button>
					</div>
				</div>

				<div v-if="clearable" class="flex items-center justify-between gap-1 border-t p-2">
					<div class="flex gap-1">
						<Button variant="outline" :label="t('Today')" @click="selectOffset(0, togglePopover)" />
						<Button variant="outline" :label="t('Tomorrow')" @click="selectOffset(1, togglePopover)" />
					</div>
					<Button
						v-if="selected"
						size="sm"
						variant="outline"
						:label="t('Clear')"
						@click="clearSelection(togglePopover)"
					/>
				</div>
			</div>
		</template>
	</Popover>
</template>

<script setup>
	import { computed, ref, watch } from 'vue'
	import { Button, FeatherIcon, Popover, TextInput } from 'frappe-ui'
	import { appointmentDeskTranslation as t } from '@/translation'
	import { calendarWeeks, datePickerLocale, modelDate, parseDate } from '@/localizedDatePicker'

	const props = defineProps({
		modelValue: { type: String, default: '' },
		value: { type: String, default: '' },
		placement: { type: String, default: 'bottom-start' },
		variant: { type: String, default: 'subtle' },
		placeholder: { type: String, default: '' },
		inputClass: { type: [String, Array, Object], default: '' },
		allowCustom: { type: Boolean, default: true },
		autoClose: { type: Boolean, default: true },
		disabled: { type: Boolean, default: false },
		readonly: { type: Boolean, default: false },
		clearable: { type: Boolean, default: true },
		formatter: { type: Function, default: null },
	})
	const emit = defineEmits(['update:modelValue', 'change', 'blur'])

	const locale = datePickerLocale()
	const localeDate = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
	const monthNames = Array.from({ length: 12 }, (_, month) => (
		new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, month, 1))
	))
	const weekdayNames = Array.from({ length: 7 }, (_, weekday) => {
		const date = new Date(2024, 0, 7 + weekday)
		return {
			long: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
			short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
		}
	})
	const today = new Date()
	const view = ref('date')
	const currentYear = ref(today.getFullYear())
	const currentMonth = ref(today.getMonth())
	const selected = ref('')
	const inputValue = ref('')
	const isTyping = ref(false)
	const popoverContent = ref(null)

	const weeks = computed(() => calendarWeeks(currentYear.value, currentMonth.value))
	const yearRangeStart = computed(() => currentYear.value - (currentYear.value % 12))
	const yearRange = computed(() => Array.from({ length: 12 }, (_, index) => yearRangeStart.value + index))

	function displayValue(value) {
		if (!value) return ''
		return props.formatter ? props.formatter(value) : value
	}

	function syncFromValue(value) {
		const date = parseDate(value)
		if (!date) {
			selected.value = ''
			inputValue.value = value ? String(value) : ''
			return
		}
		currentYear.value = date.getFullYear()
		currentMonth.value = date.getMonth()
		selected.value = modelDate(date)
		inputValue.value = displayValue(selected.value)
	}

	function initializeFromValue() {
		syncFromValue(props.modelValue || props.value)
	}

	watch(() => [props.modelValue, props.value], ([modelValue, value]) => {
		if (!isTyping.value) syncFromValue(modelValue || value)
	}, { immediate: true })

	function emitDate(value) {
		selected.value = value
		inputValue.value = displayValue(value)
		emit('update:modelValue', value)
		emit('change', value)
	}

	function selectDate(date, togglePopover) {
		currentYear.value = date.getFullYear()
		currentMonth.value = date.getMonth()
		emitDate(modelDate(date))
		view.value = 'date'
		isTyping.value = false
		if (props.autoClose) togglePopover()
	}

	function selectOffset(days, togglePopover) {
		const date = new Date()
		date.setDate(date.getDate() + days)
		selectDate(date, togglePopover)
	}

	function clearSelection(togglePopover) {
		emitDate('')
		view.value = 'date'
		isTyping.value = false
		if (props.autoClose) togglePopover()
	}

	function commitInput(close = false, togglePopover) {
		const date = parseDate(inputValue.value)
		if (date) emitDate(modelDate(date))
		else inputValue.value = displayValue(selected.value)
		isTyping.value = false
		if (close && togglePopover) togglePopover()
	}

	function activateInput(isOpen, togglePopover) {
		isTyping.value = true
		if (!isOpen) togglePopover()
	}

	function handleBlur(event) {
		if (!event.relatedTarget || !popoverContent.value?.contains(event.relatedTarget)) commitInput()
		emit('blur', event)
	}

	function handleClose() {
		view.value = 'date'
		if (isTyping.value) commitInput()
	}

	function cycleView() {
		if (view.value === 'date') view.value = 'month'
		else if (view.value === 'month') view.value = 'year'
		else view.value = 'date'
	}

	function changeMonth(delta) {
		const date = new Date(currentYear.value, currentMonth.value + delta, 1)
		currentYear.value = date.getFullYear()
		currentMonth.value = date.getMonth()
	}

	function previous() {
		if (view.value === 'date') changeMonth(-1)
		else if (view.value === 'month') currentYear.value -= 1
		else currentYear.value -= 12
	}

	function next() {
		if (view.value === 'date') changeMonth(1)
		else if (view.value === 'month') currentYear.value += 1
		else currentYear.value += 12
	}

	function selectMonth(month) {
		currentMonth.value = month
		view.value = 'date'
	}

	function selectYear(year) {
		currentYear.value = year
		view.value = 'month'
	}

	function isSelected(date) {
		return modelDate(date) === selected.value
	}

	function isToday(date) {
		return modelDate(date) === modelDate(today)
	}

	function dateClasses(date) {
		return [
			date.getMonth() === currentMonth.value ? 'text-ink-gray-8' : 'text-ink-gray-3',
			isToday(date) ? 'font-extrabold text-ink-gray-9' : '',
			isSelected(date) ? 'bg-surface-gray-6 text-ink-white hover:bg-surface-gray-6' : 'hover:bg-surface-gray-2',
		]
	}

	function dateAriaLabel(date) {
		const label = localeDate.format(date)
		return isToday(date) ? `${label} (${t('Today')})` : label
	}
</script>
