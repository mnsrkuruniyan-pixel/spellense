import test from "node:test";
import assert from "node:assert/strict";
import {
  tokenizeIdentifierLine,
  extractWords,
  toSentenceCase,
  toLowerCase,
  toUpperCase,
  toTitleCase,
  toCapitalizedCase,
  toAlternatingCase,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toConstantCase,
  toInverseCase,
  removeExtraSpaces,
  removeBlankLines,
  straightenQuotes,
  stripHtmlTags,
} from "../lib/caseConverter.ts";

const MODES = {
  sentence: toSentenceCase,
  lower: toLowerCase,
  upper: toUpperCase,
  title: toTitleCase,
  capitalized: toCapitalizedCase,
  alternating: toAlternatingCase,
  camel: toCamelCase,
  pascal: toPascalCase,
  snake: toSnakeCase,
  kebab: toKebabCase,
  constant: toConstantCase,
  inverse: toInverseCase,
};

test("BUG FIX: camelCase to Title Case preserves word boundaries", () => {
  const original = "hello world foo";
  const camel = toCamelCase(original);
  assert.equal(camel, "helloWorldFoo");

  const title = toTitleCase(camel);
  assert.equal(title, "Hello World Foo");
});

test("BUG FIX: identifier to other word-based modes preserves word boundaries", () => {
  const camel = "helloWorldFoo";
  assert.equal(toSentenceCase(camel), "Hello world foo");
  assert.equal(toCapitalizedCase(camel), "Hello World Foo");
  assert.equal(toLowerCase(camel), "hello world foo");
  assert.equal(toUpperCase(camel), "HELLO WORLD FOO");
  assert.equal(toSnakeCase(camel), "hello_world_foo");
  assert.equal(toKebabCase(camel), "hello-world-foo");
  assert.equal(toPascalCase(camel), "HelloWorldFoo");
  assert.equal(toConstantCase(camel), "HELLO_WORLD_FOO");
});

test("BUG FIX: acronyms split properly (XMLHttpRequest -> XML Http Request)", () => {
  assert.equal(tokenizeIdentifierLine("XMLHttpRequest"), "XML Http Request");
  assert.equal(toTitleCase("XMLHttpRequest"), "XML Http Request");
  assert.equal(toCamelCase("XMLHttpRequest"), "xmlHttpRequest");
  assert.equal(toSnakeCase("XMLHttpRequest"), "xml_http_request");
  assert.equal(toConstantCase("XMLHttpRequest"), "XML_HTTP_REQUEST");
});

test("12x12 Conversion Matrix: converts each mode's output to every other mode without losing words", () => {
  const sample = "quick brown fox";
  const modeKeys = Object.keys(MODES);

  for (const modeA of modeKeys) {
    const fnA = MODES[modeA];
    const outA = fnA(sample);

    for (const modeB of modeKeys) {
      const fnB = MODES[modeB];
      const outB = fnB(outA);

      // Verify that after converting from modeA to modeB, the three words "quick", "brown", "fox" are intact
      const words = extractWords(outB).map((w) => w.toLowerCase());
      assert.deepEqual(
        words,
        ["quick", "brown", "fox"],
        `Failed in chain ${modeA} -> ${modeB}: got "${outB}", extracted words: ${JSON.stringify(words)}`
      );
    }
  }
});

test("Round-trip tests: text -> mode A -> mode B -> mode A does not lose or merge words", () => {
  const words = "alpha beta gamma";
  const testModes = ["camel", "pascal", "snake", "kebab", "constant", "title", "capitalized"];

  for (const a of testModes) {
    for (const b of testModes) {
      const step1 = MODES[a](words);
      const step2 = MODES[b](step1);
      const step3 = MODES[a](step2);
      assert.equal(
        step3,
        step1,
        `Round-trip failure for ${a} -> ${b} -> ${a}: step1="${step1}", step2="${step2}", step3="${step3}"`
      );
    }
  }
});

test("Preserves normal sentences: iPhone, McDonald, well-known are not broken in sentences", () => {
  const sentence = "I bought an iPhone at McDonald and it is well-known.";
  const title = toTitleCase(sentence);
  assert.ok(title.includes("iPhone"), `Title case modified iPhone: ${title}`);
  assert.ok(title.includes("McDonald"), `Title case modified McDonald: ${title}`);
  assert.ok(title.includes("Well-Known"), `Title case did not handle well-known properly: ${title}`);

  const sent = toSentenceCase(sentence);
  assert.ok(sent.includes("iPhone"), `Sentence case modified iPhone: ${sent}`);
  assert.ok(sent.includes("McDonald"), `Sentence case modified McDonald: ${sent}`);
});

test("Title Case rules: small words stay lowercase except first/last word", () => {
  const text = "the lord of the rings and the hobbit";
  assert.equal(toTitleCase(text), "The Lord of the Rings and the Hobbit");

  const startWithSmall = "a tale of two cities";
  assert.equal(toTitleCase(startWithSmall), "A Tale of Two Cities");

  const endWithSmall = "what are we looking at";
  assert.equal(toTitleCase(endWithSmall), "What Are We Looking At");
});

test("Title Case rules: word after colon is capitalized", () => {
  const text = "star wars: a new hope";
  assert.equal(toTitleCase(text), "Star Wars: A New Hope");

  const chapter = "chapter 1: the beginning of time";
  assert.equal(toTitleCase(chapter), "Chapter 1: The Beginning of Time");
});

test("Sentence case rules: capitalize after . ? !, standalone i -> I, abbreviations", () => {
  const text = "hello world! how are you? i am doing well. i'm happy.";
  assert.equal(
    toSentenceCase(text),
    "Hello world! How are you? I am doing well. I'm happy."
  );

  const abbrev = "Mr. smith went to washington. e.g. he visited the senate.";
  assert.equal(
    toSentenceCase(abbrev),
    "Mr. smith went to washington. E.g. he visited the senate."
  );
});

test("Edge cases: empty string, whitespace, single word, single letter", () => {
  for (const [name, fn] of Object.entries(MODES)) {
    assert.equal(fn(""), "", `${name} failed on empty string`);
    assert.doesNotThrow(() => fn("   \n\t  "), `${name} threw on whitespace`);
    assert.ok(fn("hello"), `${name} failed on single word`);
    assert.ok(fn("a"), `${name} failed on single letter`);
  }

  assert.equal(toTitleCase("a"), "A");
  assert.equal(toSentenceCase("a"), "A");
  assert.equal(toCamelCase("a"), "a");
  assert.equal(toPascalCase("a"), "A");
  assert.equal(toSnakeCase("a"), "a");
  assert.equal(toKebabCase("a"), "a");
  assert.equal(toConstantCase("a"), "A");
});

test("Edge cases: multiple lines and blank lines preserved", () => {
  const multiline = "line one\n\nline two\nline three";
  const camel = toCamelCase(multiline);
  assert.equal(camel, "lineOne\n\nlineTwo\nlineThree");

  const snake = toSnakeCase(multiline);
  assert.equal(snake, "line_one\n\nline_two\nline_three");

  const title = toTitleCase(multiline);
  assert.equal(title, "Line One\n\nLine Two\nLine Three");
});

test("Edge cases: numbers (item2List, version 1.2.3, 3D)", () => {
  assert.equal(toTitleCase("item2List"), "Item 2 List");
  assert.equal(toSnakeCase("item2List"), "item_2_list");
  assert.equal(toKebabCase("item2List"), "item-2-list");
  assert.equal(toConstantCase("item2List"), "ITEM_2_LIST");

  assert.equal(toTitleCase("3D"), "3D");
  assert.equal(toUpperCase("3D"), "3D");
  assert.equal(toLowerCase("3D"), "3d");

  assert.equal(toTitleCase("version 1.2.3"), "Version 1.2.3");
});

test("Edge cases: acronyms (USA, NASA, API key)", () => {
  assert.equal(toTitleCase("the NASA space program"), "The NASA Space Program");
  assert.equal(toTitleCase("USA and NASA"), "USA and NASA");
  assert.equal(toTitleCase("api key"), "API Key");
});

test("Edge cases: accented letters (café, niño, ÉCOLE)", () => {
  assert.equal(toTitleCase("café"), "Café");
  assert.equal(toTitleCase("niño"), "Niño");
  assert.equal(toTitleCase("ÉCOLE"), "École");

  assert.equal(toSnakeCase("café niño"), "café_niño");
  assert.equal(toCamelCase("café niño"), "caféNiño");
  assert.equal(toPascalCase("café niño"), "CaféNiño");
});

test("Edge cases: Unicode, Malayalam, emoji, Chinese pass through safely", () => {
  const malayalam = "മലയാളം ടെക്സ്റ്റ് ഫോർമാറ്റർ";
  assert.doesNotThrow(() => toTitleCase(malayalam));
  assert.equal(toTitleCase(malayalam), malayalam);
  assert.equal(toLowerCase(malayalam), malayalam);
  assert.equal(toUpperCase(malayalam), malayalam);

  const emoji = "🚀 Rocket Launch 🎉";
  assert.doesNotThrow(() => toTitleCase(emoji));
  assert.ok(toTitleCase(emoji).includes("Rocket"));

  const chinese = "中文测试";
  assert.doesNotThrow(() => toTitleCase(chinese));
  assert.equal(toTitleCase(chinese), chinese);
});

test("Performance: 50,000+ words process in under 1 second without freezing", () => {
  const chunk = "the quick brown fox jumps over the lazy dog ";
  const largeText = chunk.repeat(6000); // ~54,000 words
  const start = performance.now();
  const result = toTitleCase(largeText);
  const duration = performance.now() - start;
  assert.ok(result.length > 0);
  assert.ok(duration < 1000, `Took ${duration}ms, expected < 1000ms`);
});

test("Cleaners: removeExtraSpaces keeps line breaks", () => {
  const input = "  line   one   with   spaces  \n\n  line   two  \t tabs  ";
  const output = removeExtraSpaces(input);
  assert.equal(output, "line one with spaces\n\nline two tabs");
});

test("Cleaners: removeBlankLines filters empty/whitespace lines", () => {
  const input = "line 1\n   \nline 2\n\t\n\nline 3";
  const output = removeBlankLines(input);
  assert.equal(output, "line 1\nline 2\nline 3");
});

test("Cleaners: straightenQuotes replaces curly quotes and apostrophes", () => {
  const input = "“Hello”, ‘world’! «French» „German“";
  const output = straightenQuotes(input);
  assert.equal(output, '"Hello", \'world\'! "French" "German"');
});

test("Cleaners: stripHtmlTags handles script, style, comments, and entities", () => {
  const input = `
    <div>
      <script>console.log("secret");</script>
      <style>body { color: red; }</style>
      <!-- Hidden comment -->
      <p>Hello &amp; welcome &quot;friends&quot; &lt;to&gt; our site&#39;s page&nbsp;here!</p>
    </div>
  `;
  const output = stripHtmlTags(input);
  assert.ok(!output.includes("secret"));
  assert.ok(!output.includes("color: red"));
  assert.ok(!output.includes("Hidden comment"));
  assert.ok(!output.includes("<p>"));
  assert.ok(output.includes('Hello & welcome "friends" <to> our site\'s page here!'));
});

