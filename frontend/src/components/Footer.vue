<template>
	<div class="absolute bottom-4 right-4 text-gray-600 text-sm">
		{{ t('Powered by Marley Healthcare', language) }}
	</div>
</template>

<script setup>
import { kioskTranslation as t } from '@/translation'

defineProps({
	language: { type: String, default: 'en' },
})
</script>
