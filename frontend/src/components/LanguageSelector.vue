<template>
	<div class="absolute top-4 right-4 flex space-x-4">
		<a v-for="option in options" :key="option.code" href="#"
			@click.prevent="$emit('change-language', option.code)"
			:class="[
				selectedLanguage === option.code ? 'font-bold text-ink-gray-8' : 'text-[gray]',
				'hover:underline'
			]">
			{{ option.label }}
		</a>
	</div>
</template>

<script setup>
import { availableKioskLanguages } from '@/translation'

defineProps({
	selectedLanguage: { type: String, required: true },
})

defineEmits(['change-language'])

const labels = {
	en: 'English',
	es: 'Español',
	ar: 'العربية',
	ml: 'മലയാളം',
}
const options = availableKioskLanguages()
	.filter(code => labels[code])
	.map(code => ({ code, label: labels[code] }))
</script>
