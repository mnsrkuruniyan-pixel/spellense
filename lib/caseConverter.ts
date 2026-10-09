/**
 * Case Converter Utility Library
 * Provides robust word tokenization, 12 casing transformations, and text cleaners.
 */

export const LOWERCASE_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "en", "for", "if", "in", "nor",
  "of", "on", "or", "per", "the", "to", "via", "vs", "vs.", "v.", "with"
]);

export const KNOWN_ACRONYMS = new Set([
  "USA", "NASA", "API", "XML", "HTML", "CSS", "JS", "TS", "UI", "UX",
  "URL", "URI", "ID", "SQL", "AI", "SEO", "PDF", "FAQ", "HTTP", "HTTPS",
  "REST", "SDK", "CLI", "JSON", "JWT", "RGB", "RGBA", "SVG", "UUID"
]);

export const ABBREVIATIONS = new Set([
  "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "vs.", "e.g.", "i.e.",
  "etc.", "dept.", "fig.", "no.", "approx.", "apt.", "est.", "govt.", "inc.", "ltd."
]);

/**
 * Checks if a word is in mocking/alternating case (e.g. "qUiCk", "bRoWn").
 */
export function isAlternatingCase(word: string): boolean {
  if (word.length <= 2) return false;
  let transitions = 0;
  for (let i = 0; i < word.length - 1; i++) {
    const isCurrentUpper = word[i] === word[i].toUpperCase() && word[i] !== word[i].toLowerCase();
    const isNextUpper = word[i + 1] === word[i + 1].toUpperCase() && word[i + 1] !== word[i + 1].toLowerCase();
    if (isCurrentUpper !== isNextUpper) {
      transitions++;
    }
  }
  return transitions >= 2 && transitions >= word.length / 2;
}

/**
 * Splits an identifier-style line into space-separated words.
 * Only applies if the line is a single token with no whitespace,
 * containing camelCase/PascalCase boundaries, acronyms, underscores, or hyphens.
 * Preserves normal sentences containing words like "iPhone", "McDonald", "well-known".
 */
export function tokenizeIdentifierLine(line: string): string {
  const leadingMatch = line.match(/^\s*/);
  const trailingMatch = line.match(/\s*$/);
  const leading = leadingMatch ? leadingMatch[0] : "";
  const trailing = trailingMatch ? trailingMatch[0] : "";
  const trimmed = line.slice(leading.length, line.length - trailing.length);

  if (!trimmed) return line;

  // If the trimmed line contains any whitespace, it is already a sentence / multi-token line
  if (/\s/.test(trimmed)) {
    return line;
  }

  // If the token is alternating case (e.g. "aLtErNaTiNg"), it's a single word
  if (isAlternatingCase(trimmed)) {
    return line;
  }

  // Check if it has identifier boundaries:
  // - camelCase/PascalCase transition (lower to UpperLower or UpperEnd)
  // - inverted camelCase transition (e.g. QUICKbROWNfOX)
  // - acronym transition (e.g. XMLHttpRequest)
  // - underscores or hyphens
  // - letter-number transitions (item2List: lower to digit, or digit to UpperLower)
  const hasCamel = /[a-z]([A-Z][a-z]|[A-Z]$)/.test(trimmed);
  const hasInvertedCamel = /[A-Z]+[a-z][A-Z]/.test(trimmed);
  const hasAcronym = /[A-Z]{2,}[a-z]/.test(trimmed);
  const hasDelim = /[_-]/.test(trimmed);
  const hasLetterNum = /[a-z][0-9]/.test(trimmed) || /[0-9][A-Z][a-z]/.test(trimmed);

  if (!hasCamel && !hasInvertedCamel && !hasAcronym && !hasDelim && !hasLetterNum) {
    return line;
  }

  let s = trimmed;

  // 1. Inverted camelCase: QUICKbROWNfOX -> QUICK bROWN fOX
  let safety = 0;
  while (/[A-Z]+[a-z][A-Z]+/.test(s) && safety < 10) {
    s = s.replace(/([A-Z]+)([a-z][A-Z]+)/g, "$1 $2");
    safety++;
  }

  // 2. Acronym boundary: XMLHttpRequest -> XML Http Request
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  // 3. camelCase / PascalCase boundary: helloWorld -> hello World
  s = s.replace(/([a-z])([A-Z][a-z])/g, "$1 $2");
  s = s.replace(/([a-z])([A-Z]$)/g, "$1 $2");

  // 4. Letter/number boundary: item2List -> item 2 List
  s = s.replace(/([a-z])([0-9]+)/g, "$1 $2");
  s = s.replace(/([0-9]+)([A-Z][a-z])/g, "$1 $2");

  // 5. Underscore and hyphen boundaries:
  s = s.replace(/[_-]+/g, " ");

  // 6. Collapse repeated spaces:
  s = s.replace(/\s+/g, " ").trim();

  return leading + s + trailing;
}

/**
 * Preprocesses all lines in the input text with tokenizeIdentifierLine.
 * Preserves line breaks and blank lines.
 */
export function preprocessText(text: string): string {
  if (!text) return "";
  return text
    .split(/\r\n|\r|\n/)
    .map(tokenizeIdentifierLine)
    .join("\n");
}

/**
 * Extracts words from a line for code identifier conversions (camel, snake, kebab, etc.).
 */
export function extractWords(line: string): string[] {
  const rawTokens = line.trim().split(/[\s_-]+/).filter(Boolean);
  const words: string[] = [];

  for (const token of rawTokens) {
    if (isAlternatingCase(token)) {
      const clean = token.replace(/[^\p{L}\p{N}]+/gu, "");
      if (clean) words.push(clean);
      continue;
    }

    let s = token;
    // Inverted camelCase: QUICKbROWNfOX -> QUICK bROWN fOX
    let safety = 0;
    while (/[A-Z]+[a-z][A-Z]+/.test(s) && safety < 10) {
      s = s.replace(/([A-Z]+)([a-z][A-Z]+)/g, "$1 $2");
      safety++;
    }

    // Split acronyms: XMLHttpRequest -> XML Http Request
    s = s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
    // Split camelCase: helloWorld -> hello World
    s = s.replace(/([a-z])([A-Z][a-z])/g, "$1 $2");
    s = s.replace(/([a-z])([A-Z]$)/g, "$1 $2");
    // Split letter-number: item2List -> item 2 List
    s = s.replace(/([a-z])([0-9]+)/g, "$1 $2");
    s = s.replace(/([0-9]+)([A-Z][a-z])/g, "$1 $2");

    const subWords = s
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => Boolean(w && w.trim()));
    words.push(...subWords);
  }

  return words;
}

// ==========================================
// 12 CASING CONVERSION MODES
// ==========================================

/**
 * 1. Sentence case:
 * Capitalizes first letter of each sentence (. ? ! and newlines),
 * capitalizes standalone "i" and contractions ("i'm", "i'll"),
 * does not break sentences on common abbreviations (e.g., "Mr.", "e.g.").
 */
export function toSentenceCase(text: string): string {
  if (!text) return "";
  const preprocessed = preprocessText(text);

  const lines = preprocessed.split(/\r\n|\r|\n/);
  const processedLines = lines.map((line) => {
    if (!line.trim()) return line;

    // Convert line to lowercase base, but preserve known acronyms & brand names
    const tokens = line.split(/(\s+)/);
    const lowerTokens = tokens.map((w) => {
      if (!/[\p{L}\p{N}]/u.test(w)) return w;
      const cleanUpper = w.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
      if (KNOWN_ACRONYMS.has(cleanUpper)) {
        return cleanUpper;
      }
      if (/[a-z][A-Z]/.test(w)) {
        return w;
      }
      return w.toLowerCase();
    });

    let result = lowerTokens.join("");

    // Capitalize the first letter of the line
    result = result.replace(/^(\s*)([\p{L}])/u, (_, space, char) => {
      return space + char.toUpperCase();
    });

    // Capitalize after sentence endings (. ! ?), except abbreviations
    result = result.replace(/([.!?])(\s+)([\p{L}])/gu, (match, punct, space, char, offset, fullStr) => {
      if (punct === ".") {
        const before = fullStr.slice(0, offset + 1);
        const lastWordMatch = before.match(/([a-zA-Z.]+)\.$/);
        if (lastWordMatch) {
          const word = lastWordMatch[0].toLowerCase();
          if (ABBREVIATIONS.has(word)) {
            return match; // Keep unchanged
          }
        }
      }
      return punct + space + char.toUpperCase();
    });

    // Capitalize standalone "i" and its contractions
    result = result.replace(/(^|\s)i(?=[.,!?;:]|\s|$)/g, "$1I");
    result = result.replace(/(^|\s)i('m|'ll|'ve|'d|'re)(?=[.,!?;:]|\s|$)/gi, "$1I$2");

    return result;
  });

  return processedLines.join("\n");
}

/**
 * 2. lower case:
 * Converts all letters to lowercase while maintaining words and line breaks.
 */
export function toLowerCase(text: string): string {
  if (!text) return "";
  return preprocessText(text).toLowerCase();
}

/**
 * 3. UPPER CASE:
 * Converts all letters to uppercase while maintaining words and line breaks.
 */
export function toUpperCase(text: string): string {
  if (!text) return "";
  return preprocessText(text).toUpperCase();
}

/**
 * 4. Title Case:
 * Smart title case: capitalizes major words, keeps small words lowercase
 * (unless first/last word or following a colon), handles hyphenated words,
 * and preserves uppercase acronyms (NASA, USA, API, XML).
 */
export function toTitleCase(text: string): string {
  if (!text) return "";
  const preprocessed = preprocessText(text);

  const hasLower = /[a-z]/.test(preprocessed);

  const lines = preprocessed.split(/\r\n|\r|\n/);
  const transformedLines = lines.map((line) => {
    if (!line.trim()) return line;

    // Split line into words and non-word separators
    const tokens = line.split(/(\s+)/);

    // Identify which tokens are actual words (contain alphanumeric/unicode letter)
    const wordIndices: number[] = [];
    tokens.forEach((token, idx) => {
      if (/[\p{L}\p{N}]/u.test(token)) {
        wordIndices.push(idx);
      }
    });

    if (wordIndices.length === 0) return line;

    const firstWordIdx = wordIndices[0];
    const lastWordIdx = wordIndices[wordIndices.length - 1];

    const transformedTokens = tokens.map((token, index) => {
      if (!/[\p{L}\p{N}]/u.test(token)) {
        return token;
      }

      // Check if word is immediately preceded by colon (e.g. "Title: a story")
      let followsColon = false;
      if (index > 0) {
        for (let i = index - 1; i >= 0; i--) {
          if (tokens[i].trim()) {
            if (tokens[i].endsWith(":")) {
              followsColon = true;
            }
            break;
          }
        }
      }

      const isFirstOrLast = index === firstWordIdx || index === lastWordIdx;

      // Handle hyphenated compound words like "well-known"
      if (token.includes("-")) {
        const parts = token.split("-");
        const formattedParts = parts.map((part, pIdx) => {
          if (!part) return part;
          const cleanPart = part.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
          const isPartFirst = isFirstOrLast && pIdx === 0;
          const isPartLast = isFirstOrLast && pIdx === parts.length - 1;
          if (!isPartFirst && !isPartLast && !followsColon && LOWERCASE_WORDS.has(cleanPart)) {
            return part.toLowerCase();
          }
          return capitalizeWord(part, hasLower);
        });
        return formattedParts.join("-");
      }

      const cleanWord = token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (!isFirstOrLast && !followsColon && LOWERCASE_WORDS.has(cleanWord)) {
        return token.toLowerCase();
      }

      return capitalizeWord(token, hasLower);
    });

    return transformedTokens.join("");
  });

  return transformedLines.join("\n");
}

function capitalizeWord(word: string, hasLower: boolean): string {
  const cleanWordUpper = word.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
  const rawLetters = word.replace(/[^\p{L}\p{N}]/gu, "");

  // If word is in KNOWN_ACRONYMS
  if (KNOWN_ACRONYMS.has(cleanWordUpper)) {
    // If it was already title-cased like "Http", keep it
    if (/^[A-Z][a-z]+$/.test(rawLetters)) {
      return word;
    }
    // Otherwise (e.g. "api", "API", "nasa", "NASA", "usa"), uppercase it
    return word.replace(/[\p{L}\p{N}]+/u, cleanWordUpper);
  }

  // Preserve words with brand/internal capitalization (e.g. iPhone, McDonald, eBay)
  if (/[a-z][A-Z]/.test(word)) {
    return word;
  }

  // If text already had lowercase and word was already all-caps acronym, keep it
  if (hasLower && /^[A-Z0-9]+$/.test(rawLetters) && rawLetters.length >= 2) {
    return word;
  }

  // Capitalize first letter, lowercase the rest of word
  return word.replace(/^([^\p{L}\p{N}]*)([\p{L}])(.*)$/u, (_, pre, first, rest) => {
    return pre + first.toUpperCase() + rest.toLowerCase();
  });
}

/**
 * 5. Capitalized:
 * Capitalizes every single word's first letter, rest lowercase.
 */
export function toCapitalizedCase(text: string): string {
  if (!text) return "";
  const preprocessed = preprocessText(text);

  const lines = preprocessed.split(/\r\n|\r|\n/);
  const transformed = lines.map((line) => {
    return line.replace(/\b([\p{L}])([\p{L}\p{N}]*)/gu, (_, first, rest) => {
      // Preserve brand casing like iPhone, McDonald
      if (/[a-z][A-Z]/.test(rest)) {
        return first.toUpperCase() + rest;
      }
      return first.toUpperCase() + rest.toLowerCase();
    });
  });
  return transformed.join("\n");
}

/**
 * 6. aLtErNaTiNg:
 * Alternates lowercase and uppercase characters (starting with lowercase).
 */
export function toAlternatingCase(text: string): string {
  if (!text) return "";
  const preprocessed = preprocessText(text);
  let capitalize = false;
  let result = "";
  for (const char of preprocessed) {
    if (/[\p{L}]/u.test(char)) {
      result += capitalize ? char.toUpperCase() : char.toLowerCase();
      capitalize = !capitalize;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * 7. camelCase:
 * Converts text into camelCase (e.g. "hello world" -> "helloWorld").
 * Preserves line breaks if multiple lines.
 */
export function toCamelCase(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r\n|\r|\n/);
  const convertedLines = lines.map((line) => {
    if (!line.trim()) return line;
    const words = extractWords(line);
    if (words.length === 0) return line;
    return words
      .map((w, i) =>
        i === 0
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join("");
  });
  return convertedLines.join("\n");
}

/**
 * 8. PascalCase:
 * Converts text into PascalCase (e.g. "hello world" -> "HelloWorld").
 * Preserves line breaks if multiple lines.
 */
export function toPascalCase(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r\n|\r|\n/);
  const convertedLines = lines.map((line) => {
    if (!line.trim()) return line;
    const words = extractWords(line);
    if (words.length === 0) return line;
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("");
  });
  return convertedLines.join("\n");
}

/**
 * 9. snake_case:
 * Converts text into snake_case (e.g. "hello world" -> "hello_world").
 * Preserves line breaks if multiple lines.
 */
export function toSnakeCase(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r\n|\r|\n/);
  const convertedLines = lines.map((line) => {
    if (!line.trim()) return line;
    const words = extractWords(line);
    if (words.length === 0) return line;
    return words.map((w) => w.toLowerCase()).join("_");
  });
  return convertedLines.join("\n");
}

/**
 * 10. kebab-case:
 * Converts text into kebab-case (e.g. "hello world" -> "hello-world").
 * Preserves line breaks if multiple lines.
 */
export function toKebabCase(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r\n|\r|\n/);
  const convertedLines = lines.map((line) => {
    if (!line.trim()) return line;
    const words = extractWords(line);
    if (words.length === 0) return line;
    return words.map((w) => w.toLowerCase()).join("-");
  });
  return convertedLines.join("\n");
}

/**
 * 11. CONSTANT:
 * Converts text into CONSTANT_CASE (e.g. "hello world" -> "HELLO_WORLD").
 * Preserves line breaks if multiple lines.
 */
export function toConstantCase(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r\n|\r|\n/);
  const convertedLines = lines.map((line) => {
    if (!line.trim()) return line;
    const words = extractWords(line);
    if (words.length === 0) return line;
    return words.map((w) => w.toUpperCase()).join("_");
  });
  return convertedLines.join("\n");
}

/**
 * 12. iNVERSE:
 * Inverts the case of each character (upper -> lower, lower -> upper).
 */
export function toInverseCase(text: string): string {
  if (!text) return "";
  let result = "";
  for (const char of text) {
    if (char === char.toUpperCase() && char !== char.toLowerCase()) {
      result += char.toLowerCase();
    } else if (char === char.toLowerCase() && char !== char.toUpperCase()) {
      result += char.toUpperCase();
    } else {
      result += char;
    }
  }
  return result;
}

// ==========================================
// TEXT CLEANERS
// ==========================================

/**
 * Removes extra spaces and tabs within lines, preserving line breaks.
 */
export function removeExtraSpaces(text: string): string {
  if (!text) return "";
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
}

/**
 * Removes blank or whitespace-only lines.
 */
export function removeBlankLines(text: string): string {
  if (!text) return "";
  return text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

/**
 * Straightens curly single/double quotes, apostrophes, and guillemets to straight ASCII quotes.
 */
export function straightenQuotes(text: string): string {
  if (!text) return "";
  return text
    // Curly single quotes, apostrophes, backticks, acute accents
    .replace(/[\u2018\u2019\u201A\u201B\u02BC\u02BD\u0060\u00B4]/g, "'")
    // Curly double quotes, German/low double quotes, guillemets
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"');
}

/**
 * Strips HTML tags, script/style blocks, comments, and decodes HTML entities.
 */
export function stripHtmlTags(text: string): string {
  if (!text) return "";
  let result = text;

  // 1. Remove script tags and their content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. Remove style tags and their content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 3. Remove HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, "");

  // 4. Remove all remaining HTML tags
  result = result.replace(/<[^>]+>/g, "");

  // 5. Decode standard HTML entities
  result = result
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'");

  // Decode decimal numeric entities
  result = result.replace(/&#([0-9]+);/g, (_, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 10));
    } catch {
      return "";
    }
  });

  // Decode hex numeric entities
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return "";
    }
  });

  return result;
}

