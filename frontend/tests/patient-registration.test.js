import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
	buildPatientRegistrationParams,
	getPatientRegistrationExtension,
	registrationFieldValue,
	registrationUrl,
	resolveRegisteredPatient,
} from "../src/patientRegistration.js";

test("the optional registration extension is explicit and complete", () => {
	assert.equal(getPatientRegistrationExtension({}), null);
	assert.equal(
		getPatientRegistrationExtension({
			marleyFrontend: {
				patientRegistration: { optionsUrl: "/options", submitUrl: "/submit" },
			},
		}),
		null,
	);
	const extension = getPatientRegistrationExtension({
		marleyFrontend: {
			patientRegistration: {
				optionsUrl: "/options",
				submitUrl: "/submit",
				fields: [],
			},
		},
	});
	assert.deepEqual(extension, {
		optionsUrl: "/options",
		submitUrl: "/submit",
		fields: [],
	});
	assert.equal(registrationUrl(extension), "/submit");
	assert.equal(
		registrationUrl(null),
		"/api/method/marley_frontend.waitlist.patient_registration",
	);
});

test("declarative fields preserve the base payload without domain knowledge", () => {
	const extension = {
		fields: [
			{name: "membership_kind", param: "membership_kind"},
			{name: "membership_code", param: "membership_code"},
			{name: "display_only", submit: false, derive: () => "derived"},
		],
	};
	const params = buildPatientRegistrationParams({
		firstName: "Ana",
		lastName: "Pérez",
		gender: { value: "Female" },
		contactNumber: "+54 11 5555 0101",
		email: "ana@example.test",
		dob: "1990-04-15",
		maritalStatus: "Single",
		addressLine1: "Calle 1",
		addressLine2: "Piso 2",
		city: "Villa Tesei",
		state: "Buenos Aires",
		zip: "1688",
		source: "Employee",
		employee: { value: "EMP-0001" },
	}, extension, {
		membership_kind: { value: "Member" },
		membership_code: "ABC-123",
	});
	assert.deepEqual(params, {
		first_name: "Ana",
		last_name: "Pérez",
		gender: "Female",
		mobile: "+54 11 5555 0101",
		email: "ana@example.test",
		dob: "1990-04-15",
		marital_status: "Single",
		addressLine1: "Calle 1",
		addressLine2: "Piso 2",
		city: "Villa Tesei",
		state: "Buenos Aires",
		zip: "1688",
		source: "Employee",
		employee: "EMP-0001",
		membership_kind: "Member",
		membership_code: "ABC-123",
	});
});

test("derived extension values are evaluated but need not be submitted", () => {
	const values = {start: 7};
	const field = {name: "result", derive: current => current.start * 2};
	assert.equal(registrationFieldValue(field, values), 14);
	assert.equal(registrationFieldValue({name: "start"}, values), 7);
});

test("the native component does not own product-specific field definitions", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	for (const productTerm of ["Document Type", "Document Number", "DD/MM/YYYY"]) {
		assert.equal(component.includes(productTerm), false, productTerm);
	}
});

test("configurable built-in fields expose stable hooks and a visible birth-date label", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	assert.match(component, /data-registration-built-in-field="age"/);
	assert.match(component, /data-registration-built-in-field="dob"/);
	assert.match(component, /<label[^>]*>[\s\S]*t\('Date of Birth'\)[\s\S]*<DatePicker/);
});

test("both a newly created and an existing patient continue through the native modal", () => {
	assert.deepEqual(resolveRegisteredPatient({
		patient: "CCC-PAC-2026-00001",
		patient_name: "Ana Pérez",
		created: true,
	}), {
		label: "Ana Pérez",
		value: "CCC-PAC-2026-00001",
		image: "",
		created: true,
	});
	assert.deepEqual(resolveRegisteredPatient({
		patient: "CCC-PAC-2026-00001",
		patient_name: "Ana Pérez",
		created: false,
	}), {
		label: "Ana Pérez",
		value: "CCC-PAC-2026-00001",
		image: "",
		created: false,
	});
	assert.equal(resolveRegisteredPatient({ status: "error" }), null);
});
