<template>
	<Dialog
		v-model="show"
		:options="{
			size: '4xl',
		}"
	>
		<template #body-title>
			<h3 class="text-ink-gray-8">{{ t('Book an Appointment') }}</h3>
		</template>
		<template #body-content>
			<div class="flex gap-2 mb-4">
				<Switch
					:label="t('New Patient')"
					:disabled="false"
					v-model="is_new_patient"
				/>
			</div>
			<!-- existing patient fields -->
			<div v-if="!is_new_patient">
				<div class="flex gap-2 mb-4">
					<div class="flex-1 w-auto">
						<FormControl type="autocomplete" :options="patientOptions" variant="subtle" :label="t('Select Patient')" v-model="book_patient"
							:required="true"
						>
							<template #prefix></template>
							<template #item-prefix="{ option }">
							<img
								:src="option.image.toString()"
								class="h-4 w-4 rounded-full"
							>
							</template>
						</FormControl>
						<ErrorMessage v-if="errors.patient" :message="errors.patient"/>
					</div>
					<div class="flex-1 w-auto">
						<FormControl type="text" variant="subtle" :label="t('Patient ID')" v-model="book_patient_id" :required="false" :disabled="true" />
					</div>
				</div>
				<div class="flex gap-2 my-2">
					<h4 class="py-2 font-semibold text-lg mb-2 text-ink-gray-8">{{ t('Appointment Details') }}</h4>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div class="py-1 w-full">
						<FormControl type="autocomplete" :options="practitionerOptions" variant="subtle" :label="t('Select Practitioner')" v-model="practitioner"
							:required="true" />
						<ErrorMessage v-if="errors.practitioner" :message="errors.practitioner"/>
					</div>
					<div class="py-1 w-full">
						<FormControl type="autocomplete" :options="appointmentTypeOptions" variant="subtle" :label="t('Select Appointment Type')" v-model="appointment_type"
							:required="true" />
						<ErrorMessage v-if="errors.appointment_type" :message="errors.appointment_type"/>
					</div>
					<div class="py-1 w-full">
						<DatePicker v-model="date" :label="t('Appointment Date')" variant="subtle" :placeholder="t('Select Date')" :required="true" :formatter="(date) => getFormat(date, '', true)" />
						<ErrorMessage v-if="errors.date" :message="errors.date"/>
					</div>
				</div>
				<div class="p-1 flex flex-col justify-center mt-4 space-x-4">
					<div class="rounded-lg p-4 mb-4">
						<div v-if="isLoadingSlots" class="flex justify-center items-center h-48">
							<div class="spinner-border animate-spin inline-block w-12 h-12 border-4 rounded-full" style="border-top-color: #b3bf79;" role="status">
							<span class="sr-only text-ink-gray-8">{{ t('Loading...') }}</span>
							</div>
						</div>
						<div class="grid grid-cols-2 md:grid-cols-8 gap-4" v-if="slots">
							<Button v-for="(slot, index) in slots" :key="index" :label="slot" :class="[
								selectedSlot === slot
									? 'bg-surface-gray-5 text-white'
									: 'bg-surface-white hover:bg-surface-gray-4 border shadow-sm',
								'text-xs font-medium py-0.5 px-1 rounded-md'
							]" :variant="'subtle'" theme="gray" @click="selectedSlot = slot" />
						</div>
					</div>
					<div class="flex-1 w-auto">
						<ErrorMessage v-if="errors.fetch_slot_error" :message="errors.fetch_slot_error"/>
					</div>
				</div>
			</div>

			<!-- Registration fields -->
			<div v-if="is_new_patient" data-patient-registration-form>
				<div class="grid grid-cols-3 gap-2 pb-2" data-patient-registration-grid>
					<div class="py-1 w-full">
						<FormControl type="text" variant="subtle" :label="t('First Name')" v-model="reg_firstName" :required="true" />
						<ErrorMessage v-if="errors.firstName" :message="errors.firstName"/>
					</div>
					<div class="py-1 w-full">
						<FormControl type="text" variant="subtle" :label="t('Last Name')" v-model="reg_lastName" :required="registrationBuiltInRequired('lastName')" />
						<ErrorMessage v-if="errors.lastName" :message="errors.lastName"/>
					</div>
					<div class="py-1 w-full">
						<FormControl type="text" variant="subtle" :label="t('Contact Number')" v-model="reg_contactNumber" :required="true" />
						<ErrorMessage v-if="errors.contactNumber" :message="errors.contactNumber"/>
					</div>
					<div class="py-1 w-full">
						<FormControl type="text" v-model="reg_email" :label="t('Email ID')"/>
					</div>
					<div class="py-1 w-full">
						<FormControl type="select" :options="genderOptions" variant="subtle" :label="t('Select Gender')" :placeholder="t('Select Gender')" v-model="reg_gender" :required="true" />
						<ErrorMessage v-if="errors.gender" :message="errors.gender"/>
					</div>
					<div class="py-1 w-full">
						<FormControl type="select" :options="maritalStatusOptions" v-model="reg_marital_status" :label="t('Marital Status')" :placeholder="t('Marital Status')" :required="registrationBuiltInRequired('maritalStatus')"/>
						<ErrorMessage v-if="errors.maritalStatus" :message="errors.maritalStatus"/>
					</div>
					<div
						v-if="registrationBuiltInVisible('age')"
						class="py-1 w-full"
						data-registration-built-in-field="age"
					>
						<FormControl
							type="number"
							:modelValue="registrationBuiltInValue('age', reg_age)"
							@update:modelValue="value => setRegistrationBuiltInValue('age', reg_age, value)"
							:label="t('Age')"
							:disabled="registrationBuiltInDisabled('age')"
						/>
					</div>
					<div
						v-if="registrationBuiltInVisible('dob')"
						class="py-1 w-full"
						data-registration-built-in-field="dob"
					>
						<label class="mb-1.5 block text-xs text-ink-gray-5">
							<span>
								{{ t('Date of Birth') }}
								<span v-if="registrationBuiltInRequired('dob')" class="text-ink-red-3"> *</span>
							</span>
							<DatePicker
								v-model="reg_dob"
								variant="subtle"
								:placeholder="t('Date of Birth')"
								:disabled="false"
								:required="registrationBuiltInRequired('dob')"
								:formatter="(date) => getFormat(date, '', true)"
							/>
						</label>
						<ErrorMessage v-if="errors.dob" :message="errors.dob"/>
					</div>
					<div
						v-for="field in registrationFieldsForSection(registrationExtension)"
						v-show="registrationExtensionFieldVisible(field)"
						:key="field.name"
						class="py-1 w-full"
						:data-registration-extension-field="field.name"
					>
						<label v-if="field.type === 'date'" class="mb-1.5 block text-xs text-ink-gray-5">
							<span>
								{{ t(field.label || field.name) }}
								<span v-if="registrationExtensionFieldRequired(field)" class="text-ink-red-3"> *</span>
							</span>
							<DatePicker
								:modelValue="registrationExtensionFieldValue(field)"
								@update:modelValue="value => setRegistrationExtensionFieldValue(field, value)"
								@blur="runRegistrationFieldActions(field, 'blur')"
								variant="subtle"
								:placeholder="registrationExtensionFieldPlaceholder(field)"
								:required="registrationExtensionFieldRequired(field)"
								:disabled="registrationExtensionFieldDisabled(field)"
								:formatter="(date) => getFormat(date, '', true)"
							/>
						</label>
						<FormControl
							v-else
							:type="field.type || 'text'"
							:modelValue="registrationExtensionFieldValue(field)"
							@update:modelValue="value => setRegistrationExtensionFieldValue(field, value)"
							@blur="runRegistrationFieldActions(field, 'blur')"
							:options="registrationExtensionFieldOptions(field)"
							variant="subtle"
							:label="t(field.label || field.name)"
							:placeholder="registrationExtensionFieldPlaceholder(field)"
							:required="registrationExtensionFieldRequired(field)"
							:disabled="registrationExtensionFieldDisabled(field)"
						/>
						<ErrorMessage v-if="errors[`extension_${field.name}`]" :message="errors[`extension_${field.name}`]"/>
					</div>
				</div>
				<template
					v-for="section in registrationSectionsForPlacement(registrationExtension, 'before-address')"
					:key="section.name"
				>
					<div class="flex gap-2 my-2" :data-registration-extension-section="section.name">
						<div>
							<h4 class="py-2 font-semibold text-lg text-ink-gray-8">{{ t(section.label || section.name) }}</h4>
							<p v-if="section.description" class="text-sm text-ink-gray-5">{{ t(section.description) }}</p>
						</div>
					</div>
					<div class="grid grid-cols-3 gap-2 pb-2">
						<div
							v-for="field in registrationFieldsForSection(registrationExtension, section.name)"
							v-show="registrationExtensionFieldVisible(field)"
							:key="field.name"
							class="py-1 w-full"
							:data-registration-extension-field="field.name"
						>
							<label v-if="field.type === 'date'" class="mb-1.5 block text-xs text-ink-gray-5">
								<span>
									{{ t(field.label || field.name) }}
									<span v-if="registrationExtensionFieldRequired(field)" class="text-ink-red-3"> *</span>
								</span>
								<DatePicker
									:modelValue="registrationExtensionFieldValue(field)"
									@update:modelValue="value => setRegistrationExtensionFieldValue(field, value)"
									@blur="runRegistrationFieldActions(field, 'blur')"
									variant="subtle"
									:placeholder="registrationExtensionFieldPlaceholder(field)"
									:required="registrationExtensionFieldRequired(field)"
									:disabled="registrationExtensionFieldDisabled(field)"
									:formatter="(date) => getFormat(date, '', true)"
								/>
							</label>
							<FormControl
								v-else
								:type="field.type || 'text'"
								:modelValue="registrationExtensionFieldValue(field)"
								@update:modelValue="value => setRegistrationExtensionFieldValue(field, value)"
								@blur="runRegistrationFieldActions(field, 'blur')"
								:options="registrationExtensionFieldOptions(field)"
								variant="subtle"
								:label="t(field.label || field.name)"
								:placeholder="registrationExtensionFieldPlaceholder(field)"
								:required="registrationExtensionFieldRequired(field)"
								:disabled="registrationExtensionFieldDisabled(field)"
							/>
							<ErrorMessage v-if="errors[`extension_${field.name}`]" :message="errors[`extension_${field.name}`]"/>
						</div>
					</div>
				</template>
				<div
					v-for="action in registrationActions(registrationExtension)"
					:key="action.name"
					class="mb-3 rounded border border-outline-gray-2 p-3"
					:data-registration-extension-action="action.name"
				>
					<div class="flex items-center justify-between gap-2">
						<div>
							<p v-if="action.label" class="text-sm font-medium text-ink-gray-8">{{ t(action.label) }}</p>
							<p v-if="registrationActionState(action).loading" class="text-sm text-ink-gray-5">
								{{ t(action.loadingLabel || 'Loading...') }}
							</p>
						</div>
						<Button
							v-if="action.confirmLabel"
							:label="t(action.confirmLabel)"
							:loading="registrationActionState(action).loading"
							:disabled="registrationActionState(action).loading"
							variant="subtle"
							theme="gray"
							@click="runRegistrationAction(action, 'confirm')"
						/>
					</div>
					<ErrorMessage
						v-if="registrationActionState(action).error"
						:message="registrationActionState(action).error"
					/>
					<div v-if="registrationActionState(action).response" class="mt-2 grid grid-cols-3 gap-2">
						<div
							v-for="row in registrationActionRows(action)"
							:key="row.label"
							class="text-sm"
						>
							<p class="text-ink-gray-5">{{ t(row.label) }}</p>
							<p class="text-ink-gray-8">{{ row.value }}</p>
						</div>
					</div>
				</div>
				<div class="flex gap-2 my-2">
					<h4 class="py-2 font-semibold text-lg mb-2 text-ink-gray-8">{{ t('Address & Contact') }}</h4>
				</div>

				<div class="grid grid-cols-3 gap-2">
					<div v-if="registrationBuiltInVisible('addressLine1')" class="py-1 w-full" data-registration-built-in-field="addressLine1">
						<FormControl :label="registrationBuiltInLabel('addressLine1', 'Address Line 1')" v-model="reg_addressLine1" type="text" variant="subtle" :required="registrationBuiltInRequired('addressLine1')" :disabled="registrationBuiltInDisabled('addressLine1')" />
						<ErrorMessage v-if="errors.addressLine1" :message="errors.addressLine1"/>
					</div>
					<div v-if="registrationBuiltInVisible('city')" class="py-1 w-full" data-registration-built-in-field="city">
						<FormControl :label="registrationBuiltInLabel('city', 'City/District')" v-model="reg_city" type="text" variant="subtle" :required="registrationBuiltInRequired('city')" :disabled="registrationBuiltInDisabled('city')" />
						<ErrorMessage v-if="errors.city" :message="errors.city"/>
					</div>
					<div v-if="registrationBuiltInVisible('state')" class="py-1 w-full" data-registration-built-in-field="state">
						<FormControl :label="registrationBuiltInLabel('state', 'State/Province')" v-model="reg_state" type="text" variant="subtle" :required="registrationBuiltInRequired('state')" :disabled="registrationBuiltInDisabled('state')" />
						<ErrorMessage v-if="errors.state" :message="errors.state"/>
					</div>
					<div v-if="registrationBuiltInVisible('addressLine2')" class="py-1 w-full" data-registration-built-in-field="addressLine2">
						<FormControl :label="registrationBuiltInLabel('addressLine2', 'Address Line 2')" v-model="reg_addressLine2" type="text" variant="subtle" :required="registrationBuiltInRequired('addressLine2')" :disabled="registrationBuiltInDisabled('addressLine2')" />
						<ErrorMessage v-if="errors.addressLine2" :message="errors.addressLine2"/>
					</div>
					<div v-if="registrationBuiltInVisible('zip')" class="py-1 w-full" data-registration-built-in-field="zip">
						<FormControl :label="registrationBuiltInLabel('zip', 'ZIP Code')" v-model="reg_zip" type="text" variant="subtle" :required="registrationBuiltInRequired('zip')" :disabled="registrationBuiltInDisabled('zip')" />
						<ErrorMessage v-if="errors.zip" :message="errors.zip"/>
					</div>
					<div
						v-for="field in registrationFieldsForSection(registrationExtension, 'address')"
						:key="field.name"
						class="py-1 w-full"
						:data-registration-extension-field="field.name"
					>
						<FormControl
							:type="field.type || 'text'"
							:modelValue="registrationExtensionFieldValue(field)"
							@update:modelValue="value => setRegistrationExtensionFieldValue(field, value)"
							@blur="runRegistrationFieldActions(field, 'blur')"
							:options="registrationExtensionFieldOptions(field)"
							variant="subtle"
							:label="t(field.label || field.name)"
							:placeholder="registrationExtensionFieldPlaceholder(field)"
							:required="Boolean(field.required)"
							:disabled="Boolean(field.disabled || field.derive)"
						/>
						<ErrorMessage v-if="errors[`extension_${field.name}`]" :message="errors[`extension_${field.name}`]"/>
					</div>
				</div>
				<div class="flex gap-2 my-2">
					<h4 class="py-2 font-semibold text-lg mb-2 text-ink-gray-8">{{ t('Source Details') }}</h4>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<div class="py-1 w-full">
						<FormControl :label="t('Source')" v-model="reg_source" type="select" :options="source_options" variant="subtle" :disabled="false"/>
					</div>
					<div v-if="reg_source == 'Employee'" class="py-1 w-full">
						<FormControl :label="t('Employee')" v-model="reg_employee" type="autocomplete" :options="employee_options" variant="subtle" :disabled="false" />
					</div>
				</div>
				<ErrorMessage v-if="errors.registration_error" :message="errors.registration_error"/>
			</div>

			<!-- Appointment Booking fields -->
			<div v-if="!is_new_patient">
				
			</div>
		</template>
		<template #actions>
			<div v-if="is_new_patient">
				<Button
					:loading="registration_loader"
					:disabled="registration_loader || registrationActionsLoading()"
					:variant="'solid'"
					theme="gray"
					:label="t('Register Patient')"
					@click="patient_registration()"
				/>
			</div>
			<div v-else>
				<Button v-if="selectedSlot"
					:loading="booking_loader"
					:disabled="booking_loader"
					:variant="'solid'"
					theme="gray"
					:label="t('Book Appointment')"
					@click="check_and_make_appointment()"
				/>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
	import { appointmentDeskTranslation as t } from '@/translation'
	import { reactive, ref, watch } from 'vue'
	import { createResource, Switch, DatePicker, ErrorMessage } from "frappe-ui"
	import { getFormat } from '@/utils'
	import {
		appointmentUrl,
		buildPatientAppointmentParams,
		buildPatientRegistrationParams,
		getPatientRegistrationExtension,
		registrationActionDependsOn,
		registrationActionError,
		registrationActionFingerprint,
		registrationActionParams,
		registrationActionReady,
		registrationActionResultIsCurrent,
		registrationActionResultRows,
		registrationActionShouldStart,
		registrationActions,
		registrationActionsForField,
		registrationActionUpdates,
		registrationFieldDisabled,
		registrationFieldOptions,
		registrationFieldRequired,
		registrationFieldValue,
		registrationFieldVisible,
		registrationFieldsForSection,
		registrationSectionsForPlacement,
		registrationResponseError,
		registrationUrl,
		resolveRegisteredPatient,
	} from '@/patientRegistration'

	const props = defineProps({
		defaults: Object,
	})

	const show = defineModel();

	let success_dialog = ref(false);
	let alert_dialog = ref(false);
	let error_dialog = ref(false);
	const is_new_patient = ref(false);
	let isLoadingSlots = ref(false);
	let registration_loader = ref(false);
	let booking_loader = ref(false);

	const selectedSlot = ref(null);
	const registrationExtension = getPatientRegistrationExtension(window);

	let dialog_message = ref("");
	let dialog_title = ref("");
	const book_patient_id = ref(props.defaults.patient?.value || "") || ref("");
	const reg_firstName = ref("");
	const reg_lastName = ref("");
	const reg_contactNumber = ref("");
	const reg_email = ref("");
	const reg_gender = ref("");
	const reg_dob = ref("");
	const reg_marital_status = ref("");
	const reg_age = ref(null);
	const maritalStatusOptions = ['Single', 'Married', 'Divorced', 'Widow'].map(value => ({
		label: t(value),
		value,
	}));
	const reg_addressLine1 = ref("");
	const reg_addressLine2 = ref("");
	const reg_city = ref("");
	const reg_state = ref("");
	const reg_zip = ref("");
	const reg_source = ref("");

	const date = ref(props.defaults.date) || ref(new Date().toISOString().split('T')[0]);

	const patientOptions = ref([]);
	const practitionerOptions = ref([]);
	let appointmentTypeOptions = ref([]);
	const genderOptions = ref([]);
	const source_options = ref([]);
	const employee_options = ref([]);
	const slots = ref([]);
	const registrationExtensionOptions = ref({});
	const registrationExtensionValues = reactive({});
	const registrationActionStates = reactive({});

	let errors = ref({});
	const book_patient = ref(props.defaults.patient) || ref({});
	const practitioner = props.defaults.practitioner?.[0] || ref({});
	const appointment_type = ref(props.defaults.appointment_type) || ref({});
	const reg_employee = ref({});

	const emit = defineEmits(['appointment_booked'])

	function reload_waitlist() {
		emit('appointment_booked')
	}

	function registrationBuiltInConfig(name) {
		return registrationExtension?.builtInFields?.[name] || {};
	}

	function registrationBuiltInVisible(name) {
		return !registrationBuiltInConfig(name).hidden;
	}

	function registrationBuiltInRequired(name) {
		return Boolean(registrationBuiltInConfig(name).required);
	}

	function registrationBuiltInDisabled(name) {
		const config = registrationBuiltInConfig(name);
		return Boolean(config.disabled || config.derive);
	}

	function registrationBuiltInLabel(name, fallback) {
		return t(registrationBuiltInConfig(name).label || fallback);
	}

	function registrationBuiltInValues() {
		return {
			firstName: reg_firstName.value,
			lastName: reg_lastName.value,
			contactNumber: reg_contactNumber.value,
			email: reg_email.value,
			gender: reg_gender.value,
			dob: reg_dob.value,
			age: reg_age.value,
			maritalStatus: reg_marital_status.value,
			addressLine1: reg_addressLine1.value,
			addressLine2: reg_addressLine2.value,
			city: reg_city.value,
			state: reg_state.value,
			zip: reg_zip.value,
			source: reg_source.value,
			employee: reg_employee.value,
		};
	}

	function registrationDeriveContext() {
		return {
			options: registrationExtensionOptions.value,
			builtIn: registrationBuiltInValues(),
		};
	}

	function registrationBuiltInValue(name, valueRef) {
		const config = registrationBuiltInConfig(name);
		if (typeof config.derive === 'function') {
			return config.derive(registrationBuiltInValues(), registrationDeriveContext());
		}
		return valueRef.value;
	}

	function setRegistrationBuiltInValue(name, valueRef, value) {
		if (!registrationBuiltInConfig(name).derive) valueRef.value = value;
	}

	function registrationExtensionFieldOptions(field) {
		const values = registrationFieldOptions(
			field,
			registrationExtensionValues,
			registrationDeriveContext(),
		);
		return values.map(value => (
			typeof value === 'object' ? value : { label: t(value), value }
		));
	}

	function registrationExtensionFieldVisible(field) {
		return registrationFieldVisible(
			field,
			registrationExtensionValues,
			registrationDeriveContext(),
		);
	}

	function registrationExtensionFieldRequired(field) {
		return registrationFieldRequired(
			field,
			registrationExtensionValues,
			registrationDeriveContext(),
		);
	}

	function registrationExtensionFieldDisabled(field) {
		const configured = registrationFieldDisabled(
			field,
			registrationExtensionValues,
			registrationDeriveContext(),
		);
		const disabledByAction = registrationActions(registrationExtension).some(action => {
			const disabledFields = action.disableWhileLoading === true
				? action.dependsOn || action.trigger?.fields || []
				: action.disableWhileLoading || [];
			return registrationActionState(action).loading && disabledFields.includes(field.name);
		});
		return configured || disabledByAction;
	}

	function registrationExtensionFieldPlaceholder(field) {
		const placeholder = registrationExtensionOptions.value[field.placeholderKey]
			|| field.placeholder
			|| field.label
			|| field.name;
		return t(placeholder);
	}

	function registrationExtensionFieldValue(field) {
		return registrationFieldValue(
			field,
			registrationExtensionValues,
			registrationDeriveContext(),
		);
	}

	function setRegistrationExtensionFieldValue(field, value) {
		if (field.derive) return;
		registrationExtensionValues[field.name] = value;
		invalidateRegistrationActions(field.name);
		runRegistrationFieldActions(field, 'change');
	}

	function registrationActionState(action) {
		if (!registrationActionStates[action.name]) {
			registrationActionStates[action.name] = {
				version: 0,
				loading: false,
				fingerprint: '',
				response: null,
				error: '',
			};
		}
		return registrationActionStates[action.name];
	}

	function registrationActionContext(action) {
		return {
			...registrationDeriveContext(),
			action: {
				name: action.name,
				state: registrationActionState(action),
			},
		};
	}

	function registrationActionRows(action) {
		const state = registrationActionState(action);
		return registrationActionResultRows(
			action,
			state.response,
			registrationExtensionValues,
			registrationActionContext(action),
		);
	}

	function registrationActionsLoading() {
		return registrationActions(registrationExtension).some(
			action => action.blockSubmit !== false && registrationActionState(action).loading,
		);
	}

	function invalidateRegistrationActions(fieldName) {
		for (const action of registrationActions(registrationExtension)) {
			if (!registrationActionDependsOn(action, fieldName)) continue;
			const state = registrationActionState(action);
			state.version += 1;
			state.loading = false;
			state.fingerprint = '';
			state.response = null;
			state.error = '';
			for (const name of action.clearFields || []) {
				registrationExtensionValues[name] = '';
			}
		}
	}

	async function runRegistrationAction(action) {
		const state = registrationActionState(action);
		const context = registrationActionContext(action);
		if (!registrationActionReady(action, registrationExtensionValues, context)) return;
		const fingerprint = registrationActionFingerprint(
			action,
			registrationExtensionValues,
			context,
		);
		if (!registrationActionShouldStart(state, fingerprint)) return;

		const version = state.version + 1;
		state.version = version;
		state.loading = true;
		state.fingerprint = fingerprint;
		state.response = null;
		state.error = '';
		const params = registrationActionParams(
			action,
			registrationExtensionValues,
			context,
		);
		const request = createResource({
			url: action.url,
			method: action.method || 'POST',
			makeParams() {
				return params;
			},
			onSuccess(response) {
				const currentContext = registrationActionContext(action);
				const currentFingerprint = registrationActionFingerprint(
					action,
					registrationExtensionValues,
					currentContext,
				);
				if (!registrationActionResultIsCurrent(
					state.version,
					version,
					fingerprint,
					currentFingerprint,
				)) return;
				Object.assign(
					registrationExtensionValues,
					registrationActionUpdates(
						action,
						response,
						registrationExtensionValues,
						currentContext,
					),
				);
				state.response = response;
				state.loading = false;
			},
			onError(error) {
				if (state.version !== version) return;
				state.error = registrationActionError(error);
				state.loading = false;
			},
		});
		try {
			await request.submit();
		} catch (error) {
			if (state.version === version && state.loading) {
				state.error = registrationActionError(error);
				state.loading = false;
			}
		}
	}

	function runRegistrationFieldActions(field, event) {
		for (const action of registrationActionsForField(
			registrationExtension,
			field.name,
			event,
		)) {
			runRegistrationAction(action);
		}
	}

	let patient_registration = async () => {
		let create_patient = createResource({
			url: registrationUrl(registrationExtension),
			method: "POST",
			makeParams() {
				return buildPatientRegistrationParams({
					firstName: reg_firstName.value,
					lastName: reg_lastName.value,
					gender: reg_gender.value,
					contactNumber: reg_contactNumber.value,
					email: reg_email.value,
					dob: reg_dob.value,
					maritalStatus: reg_marital_status.value,
					addressLine1: reg_addressLine1.value,
					addressLine2: reg_addressLine2.value,
					city: reg_city.value,
					state: reg_state.value,
					zip: reg_zip.value,
					source: reg_source.value,
					employee: reg_employee.value,
				}, registrationExtension, registrationExtensionValues);
			},
			onSuccess(response) {
				const responseError = registrationResponseError(response, registrationExtension);
				if (responseError) {
					patients.fetch();
					registration_loader.value = false;
					errors.value.registration_error = responseError;
					return;
				}
				const patient = resolveRegisteredPatient(response);
				if (patient) {
					patients.fetch();
					registration_loader.value = false;
					errors.value.registration_error = "";
					is_new_patient.value = false;
					book_patient.value = patient;
					book_patient_id.value = patient.value;
				} else {
					registration_loader.value = false;
					errors.value.registration_error = response;
				}
			},
			onError(error) {
				registration_loader.value = false;
				errors.value.registration_error = error;
			},
		});

		if (!reg_firstName.value) {
			errors.value.firstName = t('This field is required');
		} else {
			errors.value.firstName = "";
		}
		if (!reg_contactNumber.value) {
			errors.value.contactNumber = t('This field is required');
		} else {
			errors.value.contactNumber = "";
		}
		if (!reg_gender.value) {
			errors.value.gender = t('This field is required');
		} else {
			errors.value.gender = "";
		}
		let builtInMissing = false;
		for (const [name, config] of Object.entries(registrationExtension?.builtInFields || {})) {
			const value = registrationBuiltInValues()[name];
			const missing = Boolean(config.required) && !value;
			errors.value[name] = missing ? t('This field is required') : '';
			builtInMissing ||= missing;
		}
		let extensionMissing = false;
		for (const field of registrationExtension?.fields || []) {
			const value = registrationExtensionFieldValue(field);
			const missing = registrationExtensionFieldRequired(field)
				&& (value === null || value === undefined || value === '');
			errors.value[`extension_${field.name}`] = missing ? t('This field is required') : '';
			extensionMissing ||= missing;
		}
		if (
			!reg_firstName.value
			|| !reg_contactNumber.value
			|| !reg_gender.value
			|| builtInMissing
			|| extensionMissing
		) {
			return
		} else {
			registration_loader.value = true;
			await create_patient.submit()
		}
	};

	const check_and_make_appointment = async () => {
		if (!book_patient.value) {
			errors.value.patient = t('This field is required');
		} else {
			errors.value.patient = "";
		}
		if (!practitioner.value) {
			errors.value.practitioner = t('This field is required');
		} else {
			errors.value.practitioner = "";
		}
		if (!appointment_type.value) {
			errors.value.appointment_type = t('This field is required');
		} else {
			errors.value.appointment_type = "";
		}
		if (!book_patient.value || !practitioner.value || !appointment_type.value) {
			return
		} else {
			booking_loader.value = true;
			await make_appointment.submit()
		}
	};

	const make_appointment = createResource({
		url: appointmentUrl(registrationExtension),
		method: "POST",
		makeParams() {
			return buildPatientAppointmentParams({
				appointmentType: appointment_type?.value,
				practitioner: practitioner?.value,
				date: date.value,
				slot: selectedSlot.value,
			}, registrationExtension, book_patient?.value);
		},
		onSuccess() {
			booking_loader.value = false;
			dialog_message = t('Appointment booked successfully');
			dialog_title = t('Appointment Booked');
			success_dialog.value = true;

			show.value = false;
			practitioner.value = null;
			reload_waitlist();
		},
		onError(error) {
			booking_loader.value = false;
			if (error) {
				if (error.message.includes("OverlapError")) {
					dialog_message = t('Selected patient already have an appointment for the day. Please choose another time slot');
					dialog_title = t('Appointment Booking Failed');
					alert_dialog.value = true;
					show.value = false;
				} else {
					dialog_message = error.messages?.[0] || error;
					dialog_title = t('Appointment Booking Failed');
					alert_dialog.value = true;
				}
			}
		},
	});

	let patients = createResource({
		url: "/api/method/marley_frontend.waitlist.get_patients",
		method: "GET",
		onSuccess(response) {
			patientOptions.value = response.patients;
		},
		onError(error) {
			error_dialog.value = true;
		},
	});
	patients.fetch();

	let genders = createResource({
		url: "/api/method/marley_frontend.api.get_gender",
		method: "GET",
		onSuccess(response) {
			genderOptions.value = response.gender_list.map(value => ({
				label: t(value),
				value,
			}));
		},
		onError(error) {
			error_dialog.value = true;
		},
	});
	genders.fetch();

	if (registrationExtension) {
		const registrationOptions = createResource({
			url: registrationExtension.optionsUrl,
			method: "GET",
			onSuccess(response) {
				registrationExtensionOptions.value = response || {};
				for (const field of registrationExtension.fields) {
					const options = registrationExtensionFieldOptions(field);
					if (field.default !== undefined) {
						registrationExtensionValues[field.name] = typeof field.default === 'function'
							? field.default(registrationExtensionValues, registrationDeriveContext())
							: field.default;
					} else if (field.defaultFromSingleOption && options.length === 1) {
						registrationExtensionValues[field.name] = options[0].value;
					}
				}
			},
			onError(error) {
				errors.value.registration_error = error;
			},
		});
		registrationOptions.fetch();
	}

	const { fetch } = createResource({
		url: "/api/method/marley_frontend.waitlist.get_masters",
		method: "GET",
		onSuccess(response) {
			practitionerOptions.value = response.practitioners;
			employee_options.value = response.employee_options;
			source_options.value = response.source_options;
		},
		onError: (error) => {
			dialog_message = error.messages?.[0] || error;
			dialog_title = t('Fetching Masters Failed');
			error_dialog.value = true;
		},
	});

	fetch();

	let get_types = createResource({
		url: "/api/method/marley_frontend.waitlist.get_appointment_types",
		method: "GET",
		onSuccess(response) {
			appointmentTypeOptions.value = response;
		},
	});
	get_types.fetch();

	watch(book_patient, (patient_value) => {
		if (patient_value && patient_value.value) {
			book_patient_id.value = patient_value.value;
		}
	});

	watch(date, () => {
		fetch_slots_in_dialog();
		if (!date.value) {
			errors.value.date = t('This field is required');
		} else {
			errors.value.date = null;
		}
	});

	watch(practitioner, (practitioner) => {
		fetch_slots_in_dialog();
		if (!practitioner) {
			errors.value.practitioner = t('This field is required');
		} else {
			errors.value.practitioner = null;
		}
	});

	// Slots fetching
	const fetch_slots_in_dialog = async () => {
		let fetch_slots_in_dialog_ = createResource({
			url: "/api/method/marley_frontend.waitlist.get_slots_in_dialog",
			method: "GET",
			makeParams() {
				return {
					practitioner: practitioner?.value?.value || null,
					date: date?.value || null,
				};
			},
			onSuccess(response) {
				if (!response) {
					errors.value.fetch_slot_error = t('No Available slot for selected Date.')
				} else if (response.status == "error") {
					errors.value.fetch_slot_error = response.message;
				} else {
					errors.value.fetch_slot_error = null;
					slots.value = response.slots;
				}
			},
			onError(error) {
				errors.value.fetch_slot_error = t('Unable to fetch slots: {0}', error);
			},
		});

		try {
			isLoadingSlots.value = true;
			slots.value = [];
			await fetch_slots_in_dialog_.submit();
		} catch (error) {
			errors.value.fetch_slot_error = t('Unable to fetch slots: {0}', error);
		} finally {
			isLoadingSlots.value = false;
		}
	}
</script>
