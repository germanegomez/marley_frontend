import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
	appointmentUrl,
	buildPatientAppointmentParams,
	buildPatientRegistrationLayout,
	buildPatientRegistrationSectionLayout,
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
	registrationActionVisible,
	registrationActions,
	registrationActionsForField,
	registrationActionUpdates,
	registrationFieldDisabled,
	registrationFieldDescription,
	registrationFieldOptions,
	registrationFieldPlaceholder,
	registrationFieldRequired,
	registrationFieldValue,
	registrationFieldVisible,
	registrationFieldsForSection,
	registrationSectionsForPlacement,
	registrationResponseError,
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

test("declarative actions select explicit triggers and dependencies", () => {
	const extension = {
		actions: [
			{
				name: "lookup",
				url: "/lookup",
				dependsOn: ["kind", "code"],
				trigger: { fields: ["code"], events: ["blur", "confirm"] },
			},
			{ name: "invalid-without-url" },
		],
	};
	assert.deepEqual(registrationActions(extension).map(action => action.name), ["lookup"]);
	assert.equal(registrationActionDependsOn(extension.actions[0], "kind"), true);
	assert.equal(registrationActionDependsOn(extension.actions[0], "other"), false);
	assert.deepEqual(
		registrationActionsForField(extension, "code", "blur").map(action => action.name),
		["lookup"],
	);
	assert.deepEqual(registrationActionsForField(extension, "code", "change"), []);
});

test("declarative actions preserve entered values and apply only configured updates", () => {
	const action = {
		name: "lookup",
		url: "/lookup",
		dependsOn: ["kind", "code"],
		when: values => Boolean(values.kind && values.code),
		fingerprint: values => `${values.kind.value}:${values.code}`,
		params: (values, context) => ({
			kind: values.kind.value,
			code: values.code,
			tenant: context.options.tenant,
		}),
		applyResponse: response => ({ validation_id: response.id }),
		result: {
			rows: [
				{ label: "Status", value: "status" },
				{ label: "Hidden", value: "hidden", visible: false },
			],
		},
	};
	const values = {
		kind: { label: "Member", value: "member" },
		code: "A-1",
		modality: "A confirmar",
		insurance_payor: "Hominis",
		insurance_plan: "Plan elegido",
	};
	const before = structuredClone(values);
	const context = { options: { tenant: "north" } };

	assert.equal(registrationActionReady(action, values, context), true);
	assert.equal(registrationActionFingerprint(action, values, context), "member:A-1");
	assert.deepEqual(registrationActionParams(action, values, context), {
		kind: "member",
		code: "A-1",
		tenant: "north",
	});
	assert.deepEqual(
		registrationActionUpdates(action, { id: "VAL-1" }, values, context),
		{ validation_id: "VAL-1" },
	);
	assert.deepEqual(values, before);
	assert.deepEqual(
		registrationActionResultRows(
			action,
			{ status: "ok", hidden: "secret" },
			values,
			context,
		),
		[{ label: "Status", value: "ok" }],
	);
});

test("declarative actions deduplicate requests and reject stale responses", () => {
	const pending = { fingerprint: "member:A-1", loading: true, response: null, error: "" };
	assert.equal(registrationActionShouldStart(pending, "member:A-1"), false);
	assert.equal(registrationActionShouldStart(pending, "member:A-2"), true);
	assert.equal(registrationActionShouldStart({}, ""), false);
	assert.equal(registrationActionResultIsCurrent(4, 4, "member:A-1", "member:A-1"), true);
	assert.equal(registrationActionResultIsCurrent(5, 4, "member:A-1", "member:A-1"), false);
	assert.equal(registrationActionResultIsCurrent(4, 4, "member:A-1", "member:A-2"), false);
	assert.equal(registrationActionError({ messages: ["Safe message"] }), "Safe message");
});

test("an action panel has no inactive state footprint", () => {
	assert.equal(registrationActionVisible({ loading: false, response: null, error: "" }), false);
	assert.equal(registrationActionVisible({ loading: true, response: null, error: "" }), true);
	assert.equal(registrationActionVisible({ loading: false, response: { status: "ok" }, error: "" }), true);
	assert.equal(registrationActionVisible({ loading: false, response: null, error: "Failure" }), true);
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
		sections: [
			{name: "membership", label: "Membership", placement: "before-address"},
		],
		fields: [
			{name: "account_code"},
			{name: "membership_kind", section: "membership"},
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
	assert.deepEqual(
		registrationSectionsForPlacement(extension).map(section => section.name),
		["membership"],
	);
	assert.deepEqual(registrationFieldsForSection(null, "address"), []);
});

test("field state and options can depend on other extension values", () => {
	const values = {kind: "Member"};
	const context = {options: {plans: [
		{label: "Plan A", value: "A", kind: "Member"},
		{label: "Plan B", value: "B", kind: "Private"},
	]}};
	const field = {
		name: "plan",
		visible: current => current.kind === "Member",
		required: current => current.kind === "Member",
		disabled: current => !current.kind,
		options: (current, currentContext) => currentContext.options.plans.filter(
			option => option.kind === current.kind,
		),
		placeholder: current => current.kind === "Member" ? "Select plan" : "",
		description: current => current.kind ? "" : "Select a membership first",
	};
	assert.equal(registrationFieldVisible(field, values, context), true);
	assert.equal(registrationFieldRequired(field, values, context), true);
	assert.equal(registrationFieldDisabled(field, values, context), false);
	assert.deepEqual(registrationFieldOptions(field, values, context), [
		{label: "Plan A", value: "A", kind: "Member"},
	]);
	assert.equal(registrationFieldPlaceholder(field, values, context), "Select plan");
	assert.equal(registrationFieldDescription(field, values, context), "");
	assert.equal(
		registrationFieldDescription(field, {kind: ""}, context),
		"Select a membership first",
	);
	assert.equal(registrationFieldPlaceholder({name: "plain"}, values, context), "");
	assert.equal(registrationFieldVisible({...field, hidden: true}, values, context), false);
});

test("opaque registration context continues to the configured appointment endpoint", () => {
	const extension = {
		appointment: {
			url: "/api/method/custom.book",
			contextParam: "registration_context",
		},
	};
	const patient = resolveRegisteredPatient({
		patient: "PAT-0001",
		patient_name: "Ana Pérez",
		created: true,
		registration_context: "opaque-token",
	});
	assert.equal(appointmentUrl(extension), "/api/method/custom.book");
	assert.deepEqual(buildPatientAppointmentParams({
		appointmentType: {value: "Consulta"},
		practitioner: {value: "HLC-PRAC-0001"},
		date: "2026-10-08",
		slot: "09:00",
	}, extension, patient), {
		from_kiosk: false,
		appointment_type: "Consulta",
		practitioner: "HLC-PRAC-0001",
		patient: "PAT-0001",
		date: "2026-10-08",
		slot: "09:00",
		registration_context: "opaque-token",
	});
});

test("an application error is read only through its configured response key", () => {
	const response = {
		patient: "PAT-0001",
		coverage_error: "Coverage data could not be saved",
	};

	assert.equal(
		registrationResponseError(response, { responseErrorKey: "coverage_error" }),
		"Coverage data could not be saved",
	);
	assert.equal(registrationResponseError(response, {}), null);
	assert.equal(registrationResponseError(null, { responseErrorKey: "coverage_error" }), null);
});

test("the native component does not own product-specific field definitions", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	for (const productTerm of [
		"Document Type",
		"Document Number",
		"DD/MM/YYYY",
		"Insurance",
		"Coverage",
		"Membership Number",
	]) {
		assert.equal(component.includes(productTerm), false, productTerm);
	}
});

test("registration controls fill their grid cells without changing layout order", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	assert.match(component, /data-patient-registration-form/);
	assert.match(component, /Fields marked with \* are required/);
	assert.match(component, /grid grid-cols-1 md:grid-cols-3 gap-2 pb-2/);
	assert.match(component, /data-registration-empty-cell/);
	assert.match(component, /registrationSectionsForPlacement\(registrationExtension, 'before-address'\)/);
	assert.match(component, /registrationSectionLayout\(section\)/);
	assert.match(component, /v-show="item\.kind === 'empty' \|\| registrationExtensionFieldVisible\(item\.field\)"/);
	assert.match(component, /item\.field\.type === 'date'[\s\S]*<DatePicker/);
	assert.match(component, /:required="registrationExtensionFieldRequired\(item\.field\)"/);
	assert.match(
		component,
		/\[data-patient-registration-form\][\s\S]*?:deep\(button\[role='combobox'\]\)[\s\S]*?width:\s*100%/,
	);
	assert.match(
		component,
		/\[data-patient-registration-form\][\s\S]*?:deep\(\[data-slot='trigger'\]\)[\s\S]*?width:\s*100%/,
	);
	assert.match(component, /v-registration-control=/);
	assert.match(component, /aria-describedby/);
	assert.match(component, /aria-required/);
	assert.match(component, /aria-disabled/);
	assert.match(component, /control\.setAttribute\('autocomplete', configuration\.autocomplete\)/);
	assert.match(component, /field\.autocomplete/);
	assert.match(component, /text\.textContent = `\(\$\{t\('required'\)\}\)`/);
	assert.match(component, /const missing = registrationBuiltInRequired\(name\) && !value/);
	assert.match(component, /label: t\('Select an option'\), value: '', disabled: true/);
	assert.match(component, /--ink-gray-6, #525252/);
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

test("declarative sections keep responsive three-column order and full-width controls", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	const sectionStart = component.indexOf('v-for="section in registrationSectionsForPlacement');
	const sectionEnd = component.indexOf("{{ t('Address & Contact') }}", sectionStart);
	const sectionTemplate = component.slice(sectionStart, sectionEnd);
	assert.match(sectionTemplate, /grid-cols-1 md:grid-cols-3/);
	assert.match(sectionTemplate, /v-for="item in registrationSectionLayout\(section\)"/);
	assert.match(sectionTemplate, /item\.kind === 'empty' \? 'hidden md:block' : 'py-1 w-full'/);
	assert.equal((sectionTemplate.match(/class="w-full"/g) || []).length, 2);
	assert.match(sectionTemplate, /:class="\{ 'mb-2': !section\.description \}"/);
	assert.doesNotMatch(sectionTemplate, /(?:^|\s)(?:order-|col-span-)/);
});

test("gender keeps a distinct visible label and selection placeholder", () => {
	const component = readFileSync(
		new URL("../src/components/AppointmentModal.vue", import.meta.url),
		"utf8",
	);
	assert.match(
		component,
		/gender: \{ type: 'select', label: 'Gender', placeholder: 'Select'/,
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
