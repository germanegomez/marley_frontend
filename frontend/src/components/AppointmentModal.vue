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
					<template v-for="item in registrationLayout" :key="item.key">
						<div
							v-if="item.kind === 'empty'"
							aria-hidden="true"
							data-registration-empty-cell
						></div>
						<div
							v-else-if="item.kind === 'extension'"
							v-show="registrationExtensionFieldVisible(item.field)"
							class="py-1 w-full"
							:data-registration-extension-field="item.name"
						>
							<label v-if="item.field.type === 'date'" class="mb-1.5 block text-xs text-ink-gray-5">
								<span>
									{{ t(item.field.label || item.name) }}
									<span v-if="registrationExtensionFieldRequired(item.field)" class="text-ink-red-3"> *</span>
								</span>
								<DatePicker
									:modelValue="registrationExtensionFieldValue(item.field)"
									@update:modelValue="value => setRegistrationExtensionFieldValue(item.field, value)"
									variant="subtle"
									:placeholder="registrationExtensionFieldPlaceholder(item.field)"
									:required="registrationExtensionFieldRequired(item.field)"
									:disabled="registrationExtensionFieldDisabled(item.field)"
									:formatter="(date) => getFormat(date, '', true)"
								/>
							</label>
							<FormControl
								v-else
								:type="item.field.type || 'text'"
								class="w-full"
								:modelValue="registrationExtensionFieldValue(item.field)"
								@update:modelValue="value => setRegistrationExtensionFieldValue(item.field, value)"
								:options="registrationExtensionFieldOptions(item.field)"
								variant="subtle"
								:label="t(item.field.label || item.name)"
								:placeholder="registrationExtensionFieldPlaceholder(item.field)"
								:required="registrationExtensionFieldRequired(item.field)"
								:disabled="registrationExtensionFieldDisabled(item.field)"
							/>
							<ErrorMessage v-if="errors[`extension_${item.name}`]" :message="errors[`extension_${item.name}`]"/>
						</div>
						<div
							v-else-if="item.name === 'dob'"
							class="py-1 w-full"
							:data-registration-built-in-field="item.name"
						>
							<label
								v-registration-required="registrationBuiltInRequired('dob')"
								class="block w-full space-y-1.5 text-xs text-ink-gray-5"
								data-registration-date-control
							>
								<span class="block" data-registration-date-label>
									{{ t(registrationBuiltInLabel('dob')) }}
									<template v-if="registrationBuiltInRequired('dob')">
										<span class="text-ink-red-3" aria-hidden="true"> *</span>
										<span class="sr-only"> (required)</span>
									</template>
								</span>
								<DatePicker
									:modelValue="registrationBuiltInValue('dob')"
									@update:modelValue="value => setRegistrationBuiltInValue('dob', value)"
									class="w-full"
									variant="subtle"
									:placeholder="t('Date of Birth')"
									:disabled="registrationBuiltInDisabled('dob')"
									:required="registrationBuiltInRequired('dob')"
									:formatter="(date) => getFormat(date, '', true)"
								/>
							</label>
							<ErrorMessage v-if="errors.dob" :message="errors.dob"/>
						</div>
						<div
							v-else
							class="py-1 w-full"
							:data-registration-built-in-field="item.name"
						>
							<FormControl
								:type="registrationBuiltInType(item.name)"
								class="w-full"
								:modelValue="registrationBuiltInValue(item.name)"
								@update:modelValue="value => setRegistrationBuiltInValue(item.name, value)"
								:options="registrationBuiltInOptions(item.name)"
								:variant="registrationBuiltInVariant(item.name)"
								:label="registrationBuiltInLabel(item.name)"
								:placeholder="registrationBuiltInPlaceholder(item.name)"
								:required="registrationBuiltInRequired(item.name)"
								:disabled="registrationBuiltInDisabled(item.name)"
							/>
							<ErrorMessage v-if="errors[item.name]" :message="errors[item.name]"/>
						</div>
					</template>
				</div>
				<template
					v-for="section in registrationSectionsForPlacement(registrationExtension, 'before-address')"
					:key="section.name"
				>
					<div class="flex gap-2 my-2" :data-registration-extension-section="section.name">
						<div>
							<h4
								class="py-2 font-semibold text-lg text-ink-gray-8"
								:class="{ 'mb-2': !section.description }"
							>{{ t(section.label || section.name) }}</h4>
							<p v-if="section.description" class="text-sm text-ink-gray-5">{{ t(section.description) }}</p>
						</div>
					</div>
					<div
						class="grid grid-cols-1 md:grid-cols-3 gap-2 pb-2"
						:data-registration-section="section.name"
					>
						<div
							v-for="item in registrationSectionLayout(section)"
							v-show="item.kind === 'empty' || registrationExtensionFieldVisible(item.field)"
							:key="item.key"
							:class="item.kind === 'empty' ? 'hidden md:block' : 'py-1 w-full'"
							:data-registration-extension-field="item.kind === 'extension' ? item.name : undefined"
						>
							<div
								v-if="item.kind === 'empty'"
								aria-hidden="true"
								data-registration-empty-cell
							></div>
							<label v-else-if="item.field.type === 'date'" class="mb-1.5 block text-xs text-ink-gray-5">
								<span>
									{{ t(item.field.label || item.name) }}
									<span v-if="registrationExtensionFieldRequired(item.field)" class="text-ink-red-3"> *</span>
								</span>
								<DatePicker
									:modelValue="registrationExtensionFieldValue(item.field)"
									@update:modelValue="value => setRegistrationExtensionFieldValue(item.field, value)"
									class="w-full"
									variant="subtle"
									:placeholder="registrationExtensionFieldPlaceholder(item.field)"
									:required="registrationExtensionFieldRequired(item.field)"
									:disabled="registrationExtensionFieldDisabled(item.field)"
									:formatter="(date) => getFormat(date, '', true)"
								/>
							</label>
							<FormControl
								v-else
								:type="item.field.type || 'text'"
								class="w-full"
								:modelValue="registrationExtensionFieldValue(item.field)"
								@update:modelValue="value => setRegistrationExtensionFieldValue(item.field, value)"
								:options="registrationExtensionFieldOptions(item.field)"
								variant="subtle"
								:label="t(item.field.label || item.name)"
								:placeholder="registrationExtensionFieldPlaceholder(item.field)"
								:required="registrationExtensionFieldRequired(item.field)"
								:disabled="registrationExtensionFieldDisabled(item.field)"
							/>
							<ErrorMessage
								v-if="item.kind === 'extension' && errors[`extension_${item.name}`]"
								:message="errors[`extension_${item.name}`]"
							/>
						</div>
					</div>
				</template>
				<div class="flex gap-2 my-2">
					<h4 class="py-2 font-semibold text-lg mb-2 text-ink-gray-8">{{ t('Address & Contact') }}</h4>
				</div>

				<div
					class="grid grid-cols-1 md:grid-cols-3 gap-2"
					data-registration-section="address"
				>
					<div
						v-for="item in addressLayout"
						:key="item.key"
						:class="item.kind === 'empty' ? 'hidden md:block' : 'py-1 w-full'"
						:data-registration-built-in-field="item.kind === 'builtIn' ? item.name : undefined"
						:data-registration-extension-field="item.kind === 'extension' ? item.name : undefined"
					>
						<div
							v-if="item.kind === 'empty'"
							aria-hidden="true"
							data-registration-empty-cell
						></div>
						<FormControl
							v-else-if="item.kind === 'extension'"
							:type="item.field.type || 'text'"
							class="w-full"
							:modelValue="registrationExtensionFieldValue(item.field)"
							@update:modelValue="value => setRegistrationExtensionFieldValue(item.field, value)"
							:options="registrationExtensionFieldOptions(item.field)"
							variant="subtle"
							:label="t(item.field.label || item.name)"
							:placeholder="registrationExtensionFieldPlaceholder(item.field)"
							:required="Boolean(item.field.required)"
							:disabled="Boolean(item.field.disabled || item.field.derive)"
						/>
						<FormControl
							v-else
							:type="registrationBuiltInType(item.name)"
							class="w-full"
							:modelValue="registrationBuiltInValue(item.name)"
							@update:modelValue="value => setRegistrationBuiltInValue(item.name, value)"
							variant="subtle"
							:label="registrationBuiltInLabel(item.name)"
							:required="registrationBuiltInRequired(item.name)"
							:disabled="registrationBuiltInDisabled(item.name)"
						/>
						<ErrorMessage
							v-if="item.kind === 'extension' && errors[`extension_${item.name}`]"
							:message="errors[`extension_${item.name}`]"
						/>
						<ErrorMessage
							v-else-if="item.kind === 'builtIn' && errors[item.name]"
							:message="errors[item.name]"
						/>
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
					:disabled="registration_loader"
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
		buildPatientRegistrationLayout,
		buildPatientRegistrationSectionLayout,
		buildPatientRegistrationParams,
		getPatientRegistrationExtension,
		registrationFieldDisabled,
		registrationFieldOptions,
		registrationFieldRequired,
		registrationFieldValue,
		registrationFieldVisible,
		registrationSectionsForPlacement,
		registrationResponseError,
		registrationUrl,
		resolveRegisteredPatient,
	} from '@/patientRegistration'

	const props = defineProps({
		defaults: Object,
	})

	const show = defineModel();
	const setRegistrationRequired = (element, required) => {
		const input = element.matches('input') ? element : element.querySelector('input');
		if (!input) return;
		input.required = Boolean(required);
		input.setAttribute('aria-required', String(Boolean(required)));
	};
	const vRegistrationRequired = {
		mounted: (element, binding) => setRegistrationRequired(element, binding.value),
		updated: (element, binding) => setRegistrationRequired(element, binding.value),
	};

	let success_dialog = ref(false);
	let alert_dialog = ref(false);
	let error_dialog = ref(false);
	const is_new_patient = ref(false);
	let isLoadingSlots = ref(false);
	let registration_loader = ref(false);
	let booking_loader = ref(false);

	const selectedSlot = ref(null);
	const registrationExtension = getPatientRegistrationExtension(window);
	const registrationLayout = buildPatientRegistrationLayout(registrationExtension);
	const addressLayout = buildPatientRegistrationSectionLayout(
		registrationExtension,
		'address',
		['addressLine1', 'city', 'state', 'addressLine2', 'zip'],
	);
	function registrationSectionLayout(section) {
		return buildPatientRegistrationSectionLayout(
			registrationExtension,
			section.name,
		);
	}

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
	const reg_addressLine1 = ref("");
	const reg_addressLine2 = ref("");
	const reg_city = ref("");
	const reg_state = ref("");
	const reg_zip = ref("");
	const registrationBuiltInRefs = {
		firstName: reg_firstName,
		lastName: reg_lastName,
		contactNumber: reg_contactNumber,
		email: reg_email,
		gender: reg_gender,
		dob: reg_dob,
		age: reg_age,
		maritalStatus: reg_marital_status,
		addressLine1: reg_addressLine1,
		addressLine2: reg_addressLine2,
		city: reg_city,
		state: reg_state,
		zip: reg_zip,
	};
	const registrationBuiltInPresentation = {
		firstName: { type: 'text', label: 'First Name', required: true, variant: 'subtle' },
		lastName: { type: 'text', label: 'Last Name', variant: 'subtle' },
		contactNumber: { type: 'text', label: 'Contact Number', required: true, variant: 'subtle' },
		email: { type: 'text', label: 'Email ID' },
		gender: { type: 'select', label: 'Gender', placeholder: 'Select Gender', required: true, variant: 'subtle' },
		maritalStatus: { type: 'select', label: 'Marital Status', placeholder: 'Marital Status' },
		age: { type: 'number', label: 'Age' },
		dob: { type: 'date', label: 'Date of Birth', variant: 'subtle' },
		addressLine1: { type: 'text', label: 'Address Line 1' },
		addressLine2: { type: 'text', label: 'Address Line 2' },
		city: { type: 'text', label: 'City/District' },
		state: { type: 'text', label: 'State/Province' },
		zip: { type: 'text', label: 'ZIP Code' },
	};
	const maritalStatusOptions = ['Single', 'Married', 'Divorced', 'Widow'].map(value => ({
		label: t(value),
		value,
	}));
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

	function registrationBuiltInRequired(name) {
		return Boolean(
			registrationBuiltInPresentation[name]?.required
			|| registrationBuiltInConfig(name).required
		);
	}

	function registrationBuiltInDisabled(name) {
		const config = registrationBuiltInConfig(name);
		return Boolean(config.disabled || config.derive);
	}

	function registrationBuiltInType(name) {
		return registrationBuiltInPresentation[name]?.type || 'text';
	}

	function registrationBuiltInLabel(name, fallback = name) {
		return t(
			registrationBuiltInConfig(name).label
			|| registrationBuiltInPresentation[name]?.label
			|| fallback
		);
	}

	function registrationBuiltInPlaceholder(name) {
		const placeholder = registrationBuiltInConfig(name).placeholder
			|| registrationBuiltInPresentation[name]?.placeholder;
		return placeholder ? t(placeholder) : undefined;
	}

	function registrationBuiltInVariant(name) {
		return registrationBuiltInPresentation[name]?.variant;
	}

	function registrationBuiltInOptions(name) {
		if (name === 'gender') return genderOptions.value;
		if (name === 'maritalStatus') return maritalStatusOptions;
		return undefined;
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
		};
	}

	function registrationDeriveContext() {
		return {
			options: registrationExtensionOptions.value,
			builtIn: registrationBuiltInValues(),
		};
	}

	function registrationBuiltInValue(name) {
		const config = registrationBuiltInConfig(name);
		if (typeof config.derive === 'function') {
			return config.derive(registrationBuiltInValues(), registrationDeriveContext());
		}
		return registrationBuiltInRefs[name]?.value;
	}

	function setRegistrationBuiltInValue(name, value) {
		if (!registrationBuiltInConfig(name).derive && registrationBuiltInRefs[name]) {
			registrationBuiltInRefs[name].value = value;
		}
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
		return registrationFieldDisabled(
			field,
			registrationExtensionValues,
			registrationDeriveContext(),
		);
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
		if (!field.derive) registrationExtensionValues[field.name] = value;
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

<style scoped>
	[data-patient-registration-form] :deep(button[role='combobox']),
	[data-patient-registration-form] :deep([data-slot='trigger']) {
		width: 100%;
	}
</style>
