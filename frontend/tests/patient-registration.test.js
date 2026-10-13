import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
	buildPatientRegistrationLayout,
	buildPatientRegistrationSectionLayout,
	buildPatientRegistrationParams,
	getPatientRegistrationExtension,
	registrationFieldValue,
	registrationFieldsForSection,
	registrationUrl,
	resolveRegisteredPatient,
} from "../src/patientRegistration.js";

test("a generic layout interleaves built-in and extension fields in DOM order", () => {
	const layout = buildPatientRegistrationLayout({
		fields: [
			{name: "membership_kind"},
			{name: "membership_code"},
		],
		fieldLayout: [
			[
				{source: "extension", name: "membership_kind"},
				{source: "extension", name: "membership_code"},
				null,
			],
			[
				{source: "builtIn", name: "firstName"},
				{source: "builtIn", name: "lastName"},
				null,
			],
			[
				{source: "builtIn", name: "dob"},
				{source: "builtIn", name: "age"},
				{source: "builtIn", name: "gender"},
			],
			[
				{source: "builtIn", name: "contactNumber"},
				{source: "builtIn", name: "email"},
				{source: "builtIn", name: "maritalStatus"},
			],
		],
	});

	assert.deepEqual(
		layout.map(item => item.kind === "empty" ? null : item.key),
		[
			"extension:membership_kind",
			"extension:membership_code",
			null,
			"builtIn:firstName",
			"builtIn:lastName",
			null,
			"builtIn:dob",
			"builtIn:age",
			"builtIn:gender",
			"builtIn:contactNumber",
			"builtIn:email",
			"builtIn:maritalStatus",
		],
	);
});

test("a section layout preserves row-major order for built-in and extension fields", () => {
	const layout = buildPatientRegistrationSectionLayout({
		fields: [
			{name: "district", section: "address"},
			{name: "secondary_phone", section: "contact"},
		],
		sectionLayouts: {
			address: [
				[
					{source: "builtIn", name: "state"},
					{source: "extension", name: "district"},
					{source: "builtIn", name: "city"},
				],
				[
					{source: "builtIn", name: "addressLine1"},
					{source: "builtIn", name: "addressLine2"},
					{source: "builtIn", name: "zip"},
				],
			],
		},
	}, "address", ["addressLine1", "addressLine2", "city", "state", "zip"]);

	assert.deepEqual(layout.map(item => item.key), [
		"builtIn:state",
		"extension:district",
		"builtIn:city",
		"builtIn:addressLine1",
		"builtIn:addressLine2",
		"builtIn:zip",
	]);
});

test("the native layout stays unchanged when no field layout is configured", () => {
	const layout = buildPatientRegistrationLayout({
		fields: [
			{name: "membership_kind"},
			{name: "district", section: "address"},
		],
	});
	assert.deepEqual(layout.map(item => item.key), [
		"builtIn:firstName",
		"builtIn:lastName",
		"builtIn:contactNumber",
		"builtIn:email",
		"builtIn:gender",
		"builtIn:maritalStatus",
		"builtIn:age",
		"builtIn:dob",
		"extension:membership_kind",
	]);
});

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

test("declarative fields can target native form sections without domain knowledge", () => {
	const extension = {
		fields: [
			{name: "account_code"},
			{name: "district", section: "address"},
			{name: "secondary_phone", section: "contact"},
		],
	};
	assert.deepEqual(
		registrationFieldsForSection(extension).map(field => field.name),
		["account_code"],
	);
	assert.deepEqual(
		registrationFieldsForSection(extension, "address").map(field => field.name),
		["district"],
	);
	assert.deepEqual(registrationFieldsForSection(null, "address"), []);
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

test("registration controls fill their grid cells without changing layout order", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	assert.match(component, /data-patient-registration-form/);
	assert.match(component, /data-registration-empty-cell/);
	assert.match(
		component,
		/\[data-patient-registration-form\][\s\S]*?:deep\(button\[role='combobox'\]\)[\s\S]*?width:\s*100%/,
	);
	assert.match(
		component,
		/\[data-patient-registration-form\][\s\S]*?:deep\(\[data-slot='trigger'\]\)[\s\S]*?width:\s*100%/,
	);
});

test("birth date uses the shared date-control label and spacing contract", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	assert.match(
		component,
		/v-else-if="item\.name === 'dob'"[\s\S]*?<label[\s\S]*?data-registration-date-control[\s\S]*?t\(registrationBuiltInLabel\('dob'\)\)[\s\S]*?<DatePicker/,
	);
	assert.match(
		component,
		/data-registration-date-control[\s\S]*?registrationBuiltInRequired\('dob'\)[\s\S]*?\(required\)/,
	);
	assert.doesNotMatch(component, /<DatePicker[\s\S]*?:label="t\(registrationBuiltInLabel\('dob'\)\)"/);
});

test("gender keeps a distinct visible label and selection placeholder", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	assert.match(
		component,
		/gender: \{ type: 'select', label: 'Gender', placeholder: 'Select Gender'/,
	);
});

test("address fields keep their generic built-in and extension contracts", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	const addressSectionMarker = component.indexOf('data-registration-section="address"');
	const addressTemplate = component.slice(
		component.lastIndexOf("<div", addressSectionMarker),
		component.indexOf("{{ t('Source Details') }}"),
	);
	assert.match(addressTemplate, /grid-cols-1 md:grid-cols-3/);
	assert.match(addressTemplate, /v-for="item in addressLayout"/);
	assert.match(addressTemplate, /:data-registration-built-in-field="item\.kind === 'builtIn' \? item\.name : undefined"/);
	assert.match(addressTemplate, /:data-registration-extension-field="item\.kind === 'extension' \? item\.name : undefined"/);
	assert.equal((addressTemplate.match(/class="w-full"/g) || []).length, 2);
	assert.doesNotMatch(addressTemplate, /(?:^|\s)(?:order-|col-span-)/);
	assert.match(
		component,
		/const addressLayout = buildPatientRegistrationSectionLayout\([\s\S]*?'address'/,
	);
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
