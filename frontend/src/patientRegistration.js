const DEFAULT_REGISTRATION_URL = "/api/method/marley_frontend.waitlist.patient_registration";

export function getPatientRegistrationExtension(scope = globalThis) {
	const extension = scope?.marleyFrontend?.patientRegistration;
	if (!extension || typeof extension !== "object") return null;
	if (!extension.optionsUrl || !extension.submitUrl) return null;
	if (!Array.isArray(extension.fields)) return null;
	return extension;
}

function valueOf(value) {
	return value?.value ?? value ?? null;
}

export function registrationFieldValue(field, values, context = {}) {
	if (typeof field?.derive === "function") return field.derive(values, context);
	return values[field?.name];
}

export function buildPatientRegistrationParams(
	values,
	extension = null,
	extensionValues = {},
) {
	const params = {
		first_name: values.firstName,
		last_name: values.lastName,
		gender: valueOf(values.gender),
		mobile: values.contactNumber,
		email: values.email,
		dob: values.dob,
		marital_status: valueOf(values.maritalStatus),
		addressLine1: values.addressLine1,
		addressLine2: values.addressLine2,
		city: values.city,
		state: values.state,
		zip: values.zip,
		source: valueOf(values.source),
		employee: valueOf(values.employee),
	};
	for (const field of extension?.fields || []) {
		if (!field.name || field.submit === false) continue;
		params[field.param || field.name] = valueOf(
			registrationFieldValue(field, extensionValues),
		);
	}
	return params;
}

export function registrationUrl(extension) {
	return extension?.submitUrl || DEFAULT_REGISTRATION_URL;
}

export function resolveRegisteredPatient(response) {
	if (response?.patient) {
		return {
			label: response.patient_name,
			value: response.patient,
			image: response.image || "",
			created: Boolean(response.created),
		};
	}
	if (response?.status === "success" && response.value) {
		return {
			label: response.label,
			value: response.value,
			image: response.image || "",
			created: true,
		};
	}
	return null;
}
