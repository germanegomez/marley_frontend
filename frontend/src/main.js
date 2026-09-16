import './index.css'

import { createApp } from 'vue';
import router from './router';
import App from './App.vue';
import { initSocket } from './socket';
import translationPlugin, { loadTranslations } from './translation';

import {
	FrappeUI,
	Button,
	Input,
	TextInput,
	FormControl,
	ErrorMessage,
	Dialog,
	Alert,
	Badge,
	setConfig,
	frappeRequest,
	FeatherIcon,
	resourcesPlugin,
	Avatar,
	Tooltip,
	ListView,
	ListHeader,
	ListHeaderItem,
	ListRows,
	ListRow,
	ListRowItem,
	ListSelectBanner,
	ListFooter,
} from 'frappe-ui'

let globalComponents = {
	Button,
	Input,
	TextInput,
	FormControl,
	ErrorMessage,
	Dialog,
	Alert,
	Badge,
	FeatherIcon,
	Avatar,
	Tooltip,
	ListView,
	ListHeader,
	ListHeaderItem,
	ListRows,
	ListRow,
	ListRowItem,
	ListSelectBanner,
	ListFooter,
}

setConfig('resourceFetcher', frappeRequest)

async function bootstrap() {
	if (import.meta.env.DEV) {
		const values = await frappeRequest({
			url: '/api/method/marley_frontend.www.healthcare.get_context_for_dev',
		})
		Object.assign(window, values)
	}

	await loadTranslations()

	const app = createApp(App)
	app.use(translationPlugin)
	app.use(FrappeUI)
	app.use(router)
	// app.use(resourcesPlugin)

	for (const key in globalComponents) {
		app.component(key, globalComponents[key])
	}

	app.config.globalProperties.$socket = initSocket()
	app.mount('#app')
}

bootstrap()
