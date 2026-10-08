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
					<div v-if="registrationBuiltInVisible('age')" class="py-1 w-full">
						<FormControl
							type="number"
							:modelValue="registrationBuiltInValue('age', reg_age)"
							@update:modelValue="value => setRegistrationBuiltInValue('age', reg_age, value)"
							:label="t('Age')"
							:disabled="registrationBuiltInDisabled('age')"
						/>
					</div>
					<div v-if="registrationBuiltInVisible('dob')" class="py-1 w-full">
						<DatePicker
							v-model="reg_dob"
							variant="subtle"
							:placeholder="t('Date of Birth')"
							:disabled="false"
							:label="t('Date of Birth')"
							:required="registrationBuiltInRequired('dob')"
							:formatter="(date) => getFormat(date, '', true)"
						/>
						<ErrorMessage v-if="errors.dob" :message="errors.dob"/>
					</div>
					<div
						v-for="field in registrationExtension?.fields || []"
						:key="field.name"
						class="py-1 w-full"
						:data-registration-extension-field="field.name"
					>
						<FormControl
							:type="field.type || 'text'"
							:modelValue="registrationExtensionFieldValue(field)"
							@update:modelValue="value => setRegistrationExtensionFieldValue(field, value)"
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
					<h4 class="py-2 font-semibold text-lg mb-2 text-ink-gray-8">{{ t('Address & Contact') }}</h4>
				</div>

				<div class="grid grid-cols-3 gap-2">
					<div class="py-1 w-full">
						<FormControl :label="t('Address Line 1')" v-model="reg_addressLine1" type="text" variant="subtle" :disabled="false" />
					</div>
					<div class="py-1 w-full">
						<FormControl :label="t('City/District')" v-model="reg_city" type="text" variant="subtle" :disabled="false" />
					</div>
					<div class="py-1 w-full">
						<FormControl :label="t('State/Province')" v-model="reg_state" type="text" variant="subtle" :disabled="false" />
					</div>
					<div class="py-1 w-full">
						<FormControl :label="t('Address Line 2')" v-model="reg_addressLine2" type="text" variant="subtle" :disabled="false" />
					</div>
					<div class="py-1 w-full">
						<FormControl :label="t('ZIP Code')" v-model="reg_zip" type="text" variant="subtle" :disabled="false" />
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
		buildPatientRegistrationParams,
		getPatientRegistrationExtension,
		registrationFieldValue,
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
		};
	}

	function registrationDeriveContext() {
		return { options: registrationExtensionOptions.value };
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
		const values = field.options || registrationExtensionOptions.value[field.optionsKey] || [];
		return values.map(value => (
			typeof value === 'object' ? value : { label: t(value), value }
		));
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
		for (const [name, value] of [
			['lastName', reg_lastName.value],
			['maritalStatus', reg_marital_status.value],
			['dob', reg_dob.value],
		]) {
			const missing = registrationBuiltInRequired(name) && !value;
			errors.value[name] = missing ? t('This field is required') : '';
			builtInMissing ||= missing;
		}
		let extensionMissing = false;
		for (const field of registrationExtension?.fields || []) {
			const value = registrationExtensionFieldValue(field);
			const missing = field.required && (value === null || value === undefined || value === '');
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
		url: "/api/method/marley_frontend.waitlist.patient_appointment",
		method: "POST",
		makeParams() {
			return {
				from_kiosk: false,
				appointment_type: appointment_type?.value || null,
				practitioner: practitioner?.value?.value || null,
				patient: book_patient?.value?.value || null,
				date: date.value,
				slot: selectedSlot.value,
			};
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
						registrationExtensionValues[field.name] = field.default;
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
