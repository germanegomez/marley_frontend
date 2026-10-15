import assert from "node:assert/strict";
import test from "node:test";

import {
	calendarWeeks,
	datePickerLocale,
	modelDate,
	parseDate,
} from "../src/localizedDatePicker.js";

test("date picker locale follows the active Frappe language", () => {
	assert.equal(datePickerLocale({ language: "es" }), "es");
	assert.equal(datePickerLocale({ document: { documentElement: { lang: "es-AR" } } }), "es-AR");
});

test("date picker parses model and localized display dates without timezone shifts", () => {
	assert.equal(modelDate(parseDate("1990-04-15")), "1990-04-15");
	assert.equal(modelDate(parseDate("15/04/1990")), "1990-04-15");
	assert.equal(parseDate("31/02/1990"), null);
});

test("calendar grid contains six complete weeks around the selected month", () => {
	const weeks = calendarWeeks(2026, 9);
	assert.equal(weeks.length, 6);
	assert.ok(weeks.every(week => week.length === 7));
	assert.equal(modelDate(weeks[0][0]), "2026-09-27");
	assert.equal(modelDate(weeks[5][6]), "2026-11-07");
});
