<template>
	<div class="min-w-0">
		<label :for="id" class="mb-1 block text-xs font-medium text-ink-gray-6">
			{{ label }}
		</label>
		<Autocomplete
			v-model="model"
			:options="options"
			:multiple="multiple"
		>
			<template #target="{ togglePopover, isOpen }">
				<button
					:id="id"
					type="button"
					class="flex h-7 w-full items-center justify-between gap-2 rounded border border-transparent bg-surface-gray-2 px-2 py-1 text-left transition-colors hover:bg-surface-gray-3 focus:border-outline-gray-4 focus:outline-none focus:ring-2 focus:ring-outline-gray-3 disabled:cursor-not-allowed disabled:bg-surface-gray-3"
					:aria-label="accessibleLabel"
					:title="accessibleLabel"
					:aria-expanded="isOpen"
					aria-haspopup="listbox"
					:disabled="disabled"
					@click="togglePopover"
				>
					<span
						class="truncate text-base leading-5"
						:class="displayValue ? 'text-ink-gray-8' : 'text-ink-gray-4'"
					>
						{{ displayValue || placeholder || label }}
					</span>
					<FeatherIcon name="chevron-down" class="h-4 w-4 shrink-0 text-ink-gray-5" aria-hidden="true" />
				</button>
			</template>
			<template v-if="$slots['item-prefix']" #item-prefix="slotProps">
				<slot name="item-prefix" v-bind="slotProps" />
			</template>
		</Autocomplete>
	</div>
</template>

<script setup>
	import { computed } from 'vue'
	import { Autocomplete } from 'frappe-ui'

	const model = defineModel()
	const props = defineProps({
		id: {
			type: String,
			required: true,
		},
		label: {
			type: String,
			required: true,
		},
		accessibleLabel: {
			type: String,
			required: true,
		},
		placeholder: String,
		options: {
			type: Array,
			default: () => [],
		},
		multiple: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	})

	const displayValue = computed(() => {
		const values = Array.isArray(model.value) ? model.value : [model.value]
		return values
			.filter(Boolean)
			.map((option) => {
				if (typeof option === 'string') return option
				return option.label || option.value || ''
			})
			.filter(Boolean)
			.join(', ')
	})
</script>
