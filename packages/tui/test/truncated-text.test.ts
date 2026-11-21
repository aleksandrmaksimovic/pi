import assert from "node:assert";
import { describe, it } from "node:test";
import { Chalk } from "chalk";
import { TruncatedText } from "../src/components/truncated-text.ts";
import { visibleWidth } from "../src/utils.ts";

// Force full color in CI so ANSI assertions are deterministic
const chalk = new Chalk({ level: 3 });

describe("TruncatedText component", () => {
	it("keeps output lines unpadded", () => {
		const text = new TruncatedText("Hello world", 1, 0);
		const lines = text.render(50);

		// Should have exactly one content line (no vertical padding)
		assert.strictEqual(lines.length, 1);

		// Line is left padding plus text only: no trailing spaces to pollute terminal copies
		assert.strictEqual(visibleWidth(lines[0]), 12);
		assert.strictEqual(lines[0].replace(/\x1b\[[0-9;]*m/g, ""), " Hello world");
	});

	it("renders vertical padding as empty lines", () => {
		const text = new TruncatedText("Hello", 0, 2);
		const lines = text.render(40);

		// Should have 2 padding lines + 1 content line + 2 padding lines = 5 total
		assert.strictEqual(lines.length, 5);

		// Padding lines are empty; the content line is unpadded
		assert.strictEqual(visibleWidth(lines[0]), 0);
		assert.strictEqual(visibleWidth(lines[1]), 0);
		assert.strictEqual(visibleWidth(lines[2]), 5);
		assert.strictEqual(visibleWidth(lines[3]), 0);
		assert.strictEqual(visibleWidth(lines[4]), 0);
	});

	it("truncates long text without width padding", () => {
		const longText = "This is a very long piece of text that will definitely exceed the available width";
		const text = new TruncatedText(longText, 1, 0);
		const lines = text.render(30);

		assert.strictEqual(lines.length, 1);

		// Truncation still caps the text at the available width (30 - 2 padding = 28), plus the
		// left padding: 29 visible characters, not padded out to 30.
		assert.strictEqual(visibleWidth(lines[0]), 29);

		// Should contain ellipsis
		const stripped = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
		assert.ok(stripped.includes("..."));
	});

	it("preserves ANSI codes in output without width padding", () => {
		const styledText = `${chalk.red("Hello")} ${chalk.blue("world")}`;
		const text = new TruncatedText(styledText, 1, 0);
		const lines = text.render(40);

		assert.strictEqual(lines.length, 1);

		// Should be left padding plus 11 visible characters (ANSI codes don't count)
		assert.strictEqual(visibleWidth(lines[0]), 12);

		// Should preserve the color codes
		assert.ok(lines[0].includes("\x1b["));
	});

	it("truncates styled text and adds reset code before ellipsis", () => {
		const longStyledText = chalk.red("This is a very long red text that will be truncated");
		const text = new TruncatedText(longStyledText, 1, 0);
		const lines = text.render(20);

		assert.strictEqual(lines.length, 1);

		// Should be truncated to the available width (20 - 2 = 18), plus the left padding
		assert.strictEqual(visibleWidth(lines[0]), 19);

		// Should contain reset code before ellipsis
		assert.ok(lines[0].includes("\x1b[0m..."));
	});

	it("handles text that fits", () => {
		// With paddingX=1, available width is 30-2=28
		// "Hello world" is 11 chars, fits comfortably
		const text = new TruncatedText("Hello world", 1, 0);
		const lines = text.render(30);

		assert.strictEqual(lines.length, 1);
		assert.strictEqual(visibleWidth(lines[0]), 12);

		// Should NOT contain ellipsis
		const stripped = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
		assert.ok(!stripped.includes("..."));
	});

	it("handles empty text", () => {
		const text = new TruncatedText("", 1, 0);
		const lines = text.render(30);

		assert.strictEqual(lines.length, 1);
		assert.strictEqual(visibleWidth(lines[0]), 1);
	});

	it("stops at newline and only shows first line", () => {
		const multilineText = "First line\nSecond line\nThird line";
		const text = new TruncatedText(multilineText, 1, 0);
		const lines = text.render(40);

		assert.strictEqual(lines.length, 1);
		assert.strictEqual(visibleWidth(lines[0]), 11);

		// Should only contain "First line"
		const stripped = lines[0].replace(/\x1b\[[0-9;]*m/g, "").trim();
		assert.ok(stripped.includes("First line"));
		assert.ok(!stripped.includes("Second line"));
		assert.ok(!stripped.includes("Third line"));
	});

	it("truncates first line even with newlines in text", () => {
		const longMultilineText = "This is a very long first line that needs truncation\nSecond line";
		const text = new TruncatedText(longMultilineText, 1, 0);
		const lines = text.render(25);

		assert.strictEqual(lines.length, 1);
		assert.strictEqual(visibleWidth(lines[0]), 24);

		// Should contain ellipsis and not second line
		const stripped = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
		assert.ok(stripped.includes("..."));
		assert.ok(!stripped.includes("Second line"));
	});

	it("never adds trailing whitespace beyond the text itself", () => {
		const text = new TruncatedText("Hello world", 1, 1);
		const lines = text.render(50);

		assert.deepStrictEqual(lines, ["", " Hello world", ""]);
	});
});
