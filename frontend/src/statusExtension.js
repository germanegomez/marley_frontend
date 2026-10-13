/** Optional host contract for the existing appointment status dialog. */
export function getAppointmentStatusExtension(scope = globalThis) {
	const extension = scope?.marleyFrontend?.appointmentStatus;
	return extension?.open?.url && Array.isArray(extension.fields) ? extension : null;
}

export function createStatusExtensionController(state, {request, schedule = setTimeout, cancel = clearTimeout}) {
	let version = 0, timer = null, extension = null;
	const pending = new Map();
	const stop = () => { if (timer !== null) cancel(timer); timer = null; };
	const context = () => ({row: state.row, response: state.response, options: state.response?.options || {}});
	const setting = (value, fallback) => typeof value === 'function'
		? value(state.values, context()) : value ?? fallback;
	const params = action => action.params?.({...state.values}, context()) || {};
	const current = generation => generation === version && state.active;
	async function send(action, generation, values) {
		let timeout;
		try {
			return await Promise.race([
				request(action.url, {method: action.method || 'POST', params: values}),
				new Promise((_, reject) => { timeout = schedule(() => reject(new Error('timeout')), extension.timeoutMs || 60000); }),
			]);
		} finally { if (timeout !== undefined) cancel(timeout); }
	}
	function accept(response, initialize = false) {
		state.response = response;
		if (initialize) Object.assign(state.values, extension.initialValues?.(response, context()) || {});
		state.error = '';
	}
	async function resume(generation, processed = new Set(), polls = 0) {
		if (!current(generation)) return;
		const key = setting(extension.continue?.key, 'operation');
		if (extension.continue && setting(extension.continue.when, false) && !processed.has(key)) {
			processed.add(key);
			state.busy = true;
			try { const result = await send(extension.continue, generation, params(extension.continue));
				if (current(generation)) accept(result);
			} catch { if (current(generation)) state.error = extension.errorLabel; }
			finally { if (current(generation)) state.busy = false; }
		}
		if (!current(generation) || !extension.refresh || !setting(extension.refresh.when, false)) return;
		if (polls >= (extension.refresh.limit || 120)) { state.error = extension.errorLabel; return; }
		timer = schedule(async () => {
			timer = null;
			if (!current(generation)) return;
			try { const result = await send(extension.refresh, generation, params(extension.refresh));
				if (current(generation)) { accept(result); await resume(generation, processed, polls + 1); }
			} catch { if (current(generation)) state.error = extension.errorLabel; }
		}, extension.refresh.intervalMs || 1500);
	}
	return {
		context,
		close() { version++; stop(); state.active = false; state.busy = false; },
		async open(config, row) {
			version++; stop(); extension = config;
			Object.assign(state, {active: Boolean(config), row: {...row}, response: null, values: {}, error: '', busy: Boolean(config)});
			if (!config) return;
			const generation = version;
			try { const result = await send(config.open, generation, params(config.open));
				if (current(generation)) { accept(result, true); state.busy = false; await resume(generation); }
			} catch { if (current(generation)) { state.busy = false; state.error = config.errorLabel; } }
		},
		async act(action) {
			if (!state.active || state.busy || !setting(action.when, true)) return;
			stop(); const generation = version;
			const key = JSON.stringify([state.row.name, action.name, state.values]);
			// A lost response keeps the exact host intent; another click cannot resend a new intent.
			const values = pending.get(key) || params(action); pending.set(key, values);
			state.busy = true; state.error = '';
			try { const result = await send(action, generation, values); pending.delete(key);
				if (current(generation)) { accept(result); state.busy = false; await resume(generation); }
			} catch { if (current(generation)) state.error = extension.errorLabel; }
			finally { if (current(generation)) state.busy = false; }
		},
	};
}
