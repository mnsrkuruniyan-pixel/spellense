export interface TableOfContentsItem {
  id: string;
  title: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  readingTime: string;
  category: "OCR Spell Checking" | "Document Proofreading" | "US vs UK Dialect" | "Design Pre-Flight";
  cluster: string;
  tags: string[];
  tableOfContents: TableOfContentsItem[];
  content: string; // Markdown / semantic HTML content
  relatedSlugs: string[];
  ctaTool: {
    title: string;
    description: string;
    buttonText: string;
    href: string;
  };
  faqs?: {
    question: string;
    answer: string;
  }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-find-spelling-mistakes-in-scanned-pdf",
    title: "How to Find Spelling Mistakes in a Scanned PDF (Without Retyping)",
    subtitle: "A practical guide to extracting text, spotting hidden typos, and proofreading non-selectable PDF documents using browser-based OCR.",
    description: "Learn how to find and fix spelling mistakes in scanned PDFs where text cannot be highlighted. Free optical character recognition (OCR) proofreading guide.",
    publishedAt: "2026-09-24",
    updatedAt: "2026-09-24",
    author: {
      name: "Spellense Editorial Team",
      role: "Document QA & OCR Specialists",
    },
    readingTime: "6 min read",
    category: "OCR Spell Checking",
    cluster: "Cluster A — OCR Spell Checking",
    tags: ["PDF Spell Check", "OCR", "Scanned Documents", "Proofreading", "Paperless Office"],
    tableOfContents: [
      { id: "the-problem", title: "Why Traditional Spell Checkers Fail on Scanned PDFs" },
      { id: "raster-vs-vector", title: "Raster Bitmaps vs. Digital Text Streams" },
      { id: "step-by-step", title: "Step-by-Step: How to Scan and Proofread a Scanned PDF" },
      { id: "visual-bounding-boxes", title: "Why Visual Marker Boxes Matter for Review" },
      { id: "privacy-considerations", title: "Security & Privacy for Confidential Contracts" },
      { id: "best-practices", title: "Pro Tips for Clearer OCR Recognition" },
    ],
    ctaTool: {
      title: "Have a Scanned PDF to Check Right Now?",
      description: "Upload your multi-page PDF to Spellense. Our in-memory OCR highlights spelling errors directly over the original document pages in seconds.",
      buttonText: "Scan Your PDF for Typos Free",
      href: "/",
    },
    relatedSlugs: [
      "why-normal-spell-checkers-miss-typos-in-images",
      "how-to-check-spelling-in-canva-before-publishing",
    ],
    content: `
<p class="lead text-lg text-slate-700 leading-relaxed font-medium">
Have you ever opened an invoice, signed legal agreement, or scanned book chapter in Adobe Acrobat or your browser, pressed <code>Ctrl + F</code> (or <code>Cmd + F</code>), and realized you couldn't search or highlight a single word?
</p>

<p>
That happens because the PDF doesn't contain readable computer text. Instead, it contains a <strong>digital photograph (a raster image)</strong> of a physical piece of paper. Because word processors like Microsoft Word, Google Docs, and browser extensions cannot read the pixels inside an image without special technology, spelling mistakes stay completely invisible until an executive, client, or auditor catches them.
</p>

<p>
In this guide, we will break down why standard proofreading tools fail on scanned PDFs, how modern in-memory Optical Character Recognition (OCR) solves the problem, and how you can proofread multi-page scanned documents in seconds without retyping a single sentence.
</p>

<hr class="my-8 border-slate-200" />

<h2 id="the-problem" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Why Traditional Spell Checkers Fail on Scanned PDFs</h2>

<p>
Standard spell checkers—like the one built into your web browser, Microsoft Word, or Grammarly—rely on <strong>plain text strings</strong>. They inspect characters encoded in ASCII or Unicode standards (for example, the letter "A" is stored as character code <code>65</code>).
</p>

<p>
When you scan a physical document using a printer, scanner, or smartphone app (like CamScanner or Apple Notes), the hardware captures millions of colored dots (pixels). To your operating system, that multi-page PDF is identical to a JPEG photo taken with a camera.
</p>

<div class="my-6 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 text-amber-900">
  <div class="flex items-start gap-3">
    <span class="text-xl">⚠️</span>
    <div class="text-sm leading-relaxed">
      <strong>The Danger of Hidden PDF Errors:</strong> In a survey of print production managers, over <strong>38% of reprinted contracts and catalog supplements</strong> occurred because a scanned revision contained typographical errors that bypassed automated spell checkers.
    </div>
  </div>
</div>

<h2 id="raster-vs-vector" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Raster Bitmaps vs. Digital Text Streams</h2>

<p>
To understand how to proofread scanned documents, it helps to distinguish between the two primary types of PDFs:
</p>

<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700">
  <li>
    <strong>Native Digital PDFs (Vector / Text):</strong> Created directly from applications like Microsoft Word, Google Docs, or InDesign using "Save As PDF" or "Export". The font glyphs and exact character sequences are embedded directly in the file.
  </li>
  <li>
    <strong>Scanned Raster PDFs (Bitmaps):</strong> Created by scanning hard-copy documents or saving flattened images. The PDF acts merely as a wrapper holding high-resolution TIFF, PNG, or JPEG image layers.
  </li>
</ul>

<p>
To spell-check a raster PDF, a computer must first convert the pixel patterns of letters into recognized digital vocabulary—a process known as <strong>Optical Character Recognition (OCR)</strong>.
</p>

<h2 id="step-by-step" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Step-by-Step: How to Scan and Proofread a Scanned PDF</h2>

<p>
Here is the easiest, zero-software workflow to verify the spelling of any scanned PDF document:
</p>

<ol class="list-decimal pl-6 space-y-4 my-6 text-slate-700">
  <li>
    <strong>Upload the PDF:</strong> Drag and drop your PDF into <a href="/" class="text-blue-600 font-semibold underline underline-offset-2 hover:text-blue-800">Spellense</a>. Files up to 25 MB with multiple pages are supported.
  </li>
  <li>
    <strong>Automatic OCR Extraction:</strong> In-memory neural OCR processes each page. The engine identifies lines, words, punctuation, and character shapes, calculating precise coordinate bounding boxes for every detected term.
  </li>
  <li>
    <strong>Dual Lexicon Verification:</strong> Each extracted word is checked against comprehensive American English (en-US) and British/Commonwealth English (en-GB) dictionaries, while cross-referencing brand name whitelists.
  </li>
  <li>
    <strong>Interactive Page-by-Page Proofreading:</strong> Navigate through your document pages. Any suspected typos or misspellings are outlined in real time with high-visibility marker pins directly on the original scanned page.
  </li>
  <li>
    <strong>Export the Audit Report:</strong> Click "Download Report" to save a clean text log of every mistake, the exact page number it occurred on, and the recommended dictionary fix.
  </li>
</ol>

<h2 id="visual-bounding-boxes" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Why Visual Marker Boxes Matter for Review</h2>

<p>
Most legacy OCR software exports an ugly, unformatted text dump into Notepad. The problem with text dumps is that you lose all context: Which column was the error in? Was it part of a legal clause, a footnote, or a table header?
</p>

<p>
A modern visual proofreader maps the exact <code>[x, y, width, height]</code> coordinates back onto the rendered canvas. When you click an issue in the sidebar, the canvas automatically zooms into that exact paragraph on your scanned sheet, so you can immediately see whether it's a genuine misspelling or a specialized industry term.
</p>

<h2 id="privacy-considerations" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Security & Privacy for Confidential Contracts</h2>

<p>
Scanned PDFs frequently contain sensitive personal, financial, or legal information—such as lease agreements, signed medical forms, or proprietary business proposals.
</p>

<p>
When choosing a tool to proofread your PDFs, always verify its data retention policies. Many generic online PDF converters store your documents indefinitely on remote storage buckets or use them to train machine learning models.
</p>

<p>
<strong>Spellense utilizes a zero-retention, ephemeral in-memory architecture:</strong>
</p>
<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700">
  <li>Files are analyzed exclusively in temporary RAM during your session.</li>
  <li>Zero permanent copies are written to physical server disks.</li>
  <li>The moment your analysis completes or you close the browser tab, the memory buffer is instantly released.</li>
</ul>

<h2 id="best-practices" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Pro Tips for Clearer OCR Recognition</h2>

<p>
To ensure the highest accuracy when scanning physical documents for proofreading:
</p>

<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700">
  <li><strong>Scan at 300 DPI:</strong> 300 DPI provides the ideal balance between crisp letter edges and fast processing speed. Anything below 150 DPI causes letters like "rn" to blend into "m".</li>
  <li><strong>Avoid Skew & Heavy Shadows:</strong> Keep pages straight on the scanner glass. Curvature near the binding of thick books can distort font baselines.</li>
  <li><strong>High Contrast Lighting:</strong> If using a smartphone scanner app, ensure even daylight without cast shadows across the text blocks.</li>
</ul>
`,
  },
  {
    slug: "how-to-check-spelling-in-canva-before-publishing",
    title: "How to Check Spelling in Canva (Does Canva Have Spell Check?)",
    subtitle: "Where to find Canva's spell check option, how to enable it, why typos still slip through in designs, and how to proofread Canva PDFs and graphics before publishing.",
    description: "Looking for spell check in Canva? Learn where Canva's spell check option is located, how to turn it on, and how to thoroughly check Canva PDFs and posters for typos before printing.",
    publishedAt: "2026-09-24",
    updatedAt: "2026-10-02",
    author: {
      name: "Spellense Editorial Team",
      role: "Creative QA & Design Specialists",
    },
    readingTime: "6 min read",
    category: "Design Pre-Flight",
    cluster: "Cluster A — OCR Spell Checking",
    tags: ["Canva Spell Check", "Where is Spell Check in Canva", "Canva PDF Proofreading", "Graphic Design QA", "Canva"],
    tableOfContents: [
      { id: "does-canva-have-spell-check", title: "Does Canva Have a Spell Check Option?" },
      { id: "where-is-spell-check-in-canva", title: "Where is Spell Check in Canva? (How to Turn It On)" },
      { id: "why-canva-misses-typos", title: "Why Canva's Built-In Spell Check Misses Critical Typos" },
      { id: "flattened-exports", title: "What Happens When Canva Exports to PNG or PDF" },
      { id: "pre-flight-checklist", title: "The 5-Step Canva Pre-Flight Proofreading Routine" },
      { id: "discount-math-dates", title: "Checking Pricing Math and Event Dates" },
      { id: "automated-design-audit", title: "How to Spell Check Exported Canva PDFs with Spellense" },
      { id: "faq", title: "Frequently Asked Questions (FAQ)" },
    ],
    ctaTool: {
      title: "Exported Your Canva Poster or PDF?",
      description: "Upload your Canva PDF, PNG, or JPG directly to Spellense. Detect typos, price math mismatches, and safe-zone bleeds right on your artwork in seconds.",
      buttonText: "Audit Your Canva Design Free",
      href: "/design-check",
    },
    relatedSlugs: [
      "how-to-find-spelling-mistakes-in-scanned-pdf",
      "why-normal-spell-checkers-miss-typos-in-images",
    ],
    faqs: [
      {
        question: "Does Canva have a spell check option?",
        answer: "Yes, Canva features a built-in spell checker in its desktop web editor and desktop app. When turned on, it highlights unrecognised words with red squiggly underlines. However, it only inspects editable digital text boxes and does not check curved text, all-caps headlines, or downloaded PDF/image files.",
      },
      {
        question: "Where is spell check in Canva?",
        answer: "To access spell check in Canva, open your design project, click 'File' in the top-left menu bar, select 'View settings' (or 'Settings'), and toggle 'Check spelling' on. Once enabled, misspelled words will display red squiggly underlines that you can right-click to correct.",
      },
      {
        question: "Why is Canva spell check not catching errors in my design?",
        answer: "Canva spell check frequently misses mistakes because it ignores all-caps text (treating it as acronyms), text along curved or rotated paths, fragmented text spread across multiple separate boxes, and placeholder copy. Crucially, once you export your design to PNG, JPG, or PDF, Canva's live spell check no longer exists.",
      },
      {
        question: "How do I spell check a Canva PDF before printing?",
        answer: "Download your Canva design as a 'PDF Print' or 'PDF Standard' via Share > Download. Then upload the file to Spellense. Spellense scans the entire visual layout using Optical Character Recognition (OCR), highlighting spelling mistakes directly on the document canvas in red.",
      },
      {
        question: "Can you spell check on the Canva mobile app?",
        answer: "The Canva mobile app for iOS and Android does not have the desktop 'File > View settings > Check spelling' menu switch. Instead, it relies on your smartphone keyboard's native autocorrect and spell check dictionaries while typing.",
      },
    ],
    content: `
<p class="lead text-lg text-slate-700 leading-relaxed font-medium">
Canva has revolutionized graphic design for small businesses, marketing teams, educators, and content creators. With millions of ready-to-use templates, anyone can assemble a vibrant flyer, brochure, promotional poster, or social media ad in minutes. But there is a silent danger lurking in almost every visual design: <strong>the undetected typo</strong>.
</p>

<p>
Unlike dedicated word processors like Microsoft Word or Google Docs, graphic design suites prioritize visual aesthetics over rigorous copyediting. A single misspelled word on a 5,000-copy print run or a high-budget social media ad campaign can cost thousands of dollars in reprints and damage your brand's credibility.
</p>

<p>
If you are wondering whether Canva has an automated spell checker, where to find it, or how to catch errors that Canva's editor ignores, this complete guide covers everything you need to know.
</p>

<hr class="my-8 border-slate-200" />

<h2 id="does-canva-have-spell-check" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Does Canva Have a Spell Check Option?</h2>

<p>
<strong>Yes, Canva does have a built-in spell check tool.</strong> It is available in both the Canva web editor (Chrome, Safari, Firefox, Edge) and the official Canva desktop applications for Mac and Windows.
</p>

<p>
When enabled, Canva scans the text in your active text boxes and underlines potential spelling mistakes with red wavy lines. You can right-click on any underlined word to view suggested replacements or add brand-specific terminology to your custom Canva dictionary.
</p>

<div class="my-6 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 text-blue-950">
  <div class="flex items-start gap-3">
    <span class="text-xl">💡</span>
    <div class="text-sm leading-relaxed">
      <strong>Important Limitation:</strong> Canva's spell checker only operates on <em>active, editable text boxes</em> inside the design canvas. It will not check text converted to curves, headlines typed in ALL-CAPS, text nested inside SVG illustrations, or finished designs downloaded as PDF, PNG, or JPG files.
    </div>
  </div>
</div>

<h2 id="where-is-spell-check-in-canva" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Where is Spell Check in Canva? (How to Turn It On)</h2>

<p>
If you are typing in Canva and do not see red underlines under misspelled words, Canva's spell check is likely turned off. Here is how to find and enable spell check in Canva step-by-step:
</p>

<ol class="list-decimal pl-6 space-y-3 my-4 text-slate-700">
  <li>
    <strong>Open your project:</strong> Launch Canva and open any design (poster, presentation, flyer, or doc).
  </li>
  <li>
    <strong>Click "File":</strong> In the top-left navigation bar (next to the Home button), click the <strong>File</strong> menu.
  </li>
  <li>
    <strong>Go to "View settings":</strong> In the dropdown menu, hover over or click on <strong>View settings</strong> (or <strong>Settings</strong> in newer Canva layouts).
  </li>
  <li>
    <strong>Check "Check spelling":</strong> Look for the <strong>Check spelling</strong> option and click it so that a checkmark (✓) appears beside it.
  </li>
</ol>

<div class="my-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
  <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Canva Spell Check Menu Path</div>
  <code class="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-block">
    File &rarr; View settings &rarr; Check spelling (✓)
  </code>
</div>

<p>
Once enabled, select any text box containing an intentional typo. You should see a wavy red underline beneath the word. Right-clicking the word displays Canva's spelling suggestions.
</p>

<h3 class="text-xl font-bold text-slate-900 mt-6 mb-3">Where is Spell Check in the Canva Mobile App?</h3>
<p>
The Canva mobile app for iOS (iPhone/iPad) and Android does not have the desktop "View settings &gt; Check spelling" toggle. Instead, the mobile app relies entirely on your smartphone operating system's built-in keyboard autocorrect and dictionary.
</p>

<h2 id="why-canva-misses-typos" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Why Canva's Built-In Spell Check Misses Critical Typos</h2>

<p>
While Canva's native spell checker is helpful for basic body paragraphs, graphic design realities cause dozens of errors to slip through unnoticed:
</p>

<ul class="list-disc pl-6 space-y-3 my-4 text-slate-700">
  <li>
    <strong>All-Caps Display Fonts:</strong> Most advertising headlines are styled in uppercase (e.g., <code>BEAUTIFULL DISCOUNTS</code>). Standard spellcheck algorithms often interpret all-caps strings as acronyms or product codes (like NASA or COVID) and skip them entirely.
  </li>
  <li>
    <strong>Curved, Tilted, and Rotated Text:</strong> Text that is bent along a badge circle, arched over a header, or rotated 90 degrees frequently bypasses canvas spell check dictionaries.
  </li>
  <li>
    <strong>Split & Layered Text Boxes:</strong> To achieve staggered typography or two-tone color effects, designers often split phrases across multiple text boxes. This breaks grammatical context and prevents compound word validation.
  </li>
  <li>
    <strong>Template Placeholders:</strong> Dummy copy like <em>"Company Name Here"</em> or <em>"Lorem Ipsum"</em> is grammatically valid in isolation and won't trigger spell check warnings.
  </li>
</ul>

<h2 id="flattened-exports" class="text-2xl font-bold text-slate-900 mt-10 mb-4">What Happens When Canva Exports to PNG or PDF</h2>

<p>
When you download your finished design as a <strong>PNG, JPG, or Print PDF</strong>, Canva renders the layout into a flattened visual file. The individual editable text boxes cease to exist as live text; they become pixels in an image or vector paths in a print stream.
</p>

<p>
Once exported, your proofreading browser extensions (like Grammarly) can no longer read or flag the text. If you send that file to a commercial print shop or publish it to Instagram, Facebook, or LinkedIn, any typos in that graphic are completely permanent.
</p>

<h2 id="pre-flight-checklist" class="text-2xl font-bold text-slate-900 mt-10 mb-4">The 5-Step Canva Pre-Flight Proofreading Routine</h2>

<p>
Before you finalize any client creative, promotional campaign, or print batch, follow this 5-minute pre-flight audit:
</p>

<ol class="list-decimal pl-6 space-y-3 my-4 text-slate-700">
  <li><strong>Read Backwards:</strong> Read the copy from the bottom-right corner to the top-left, word by word. This detaches your brain from anticipating the sentence meaning and forces you to inspect individual word spellings.</li>
  <li><strong>Verify Contact Details:</strong> Dial the phone number on your keypad, click test the website URL, and double-check email addresses for transposed letters (like <code>@gnail.com</code>).</li>
  <li><strong>Check Year & Day Coherence:</strong> If your poster says <em>"Friday, November 14th"</em>, open your calendar and confirm that the 14th is genuinely a Friday. Date mismatches are among the most common flyer mistakes.</li>
  <li><strong>Asterisk (*) Matching:</strong> If you placed an asterisk in your headline (e.g. <em>"50% Off Everything*"</em>), ensure there is an explanatory footnote disclaimer at the bottom explaining the terms.</li>
  <li><strong>Export and Run Automated QA:</strong> Download your finished Canva layout as a high-res PNG or PDF and run it through an automated visual QA scanner.</li>
</ol>

<h2 id="discount-math-dates" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Checking Pricing Math and Event Dates</h2>

<div class="my-6 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 text-blue-950">
  <div class="text-sm font-semibold uppercase tracking-wider text-blue-700">The Pricing Math Trap</div>
  <p class="mt-1 text-sm leading-relaxed">
    Consider this real-world flyer error: <em>"HUGE SALE: 50% OFF! Was $100, Now $60."</em><br />
    A discount from $100 to $60 is a <strong>40% discount</strong>, not 50%. Such arithmetic discrepancies confuse customers, trigger negative comments on social ads, and violate advertising standards in regulated markets.
  </p>
</div>

<h2 id="automated-design-audit" class="text-2xl font-bold text-slate-900 mt-10 mb-4">How to Spell Check Exported Canva PDFs with Spellense</h2>

<p>
Instead of relying solely on tired eyes after hours of designing, use <a href="/design-check" class="text-blue-600 font-semibold underline underline-offset-2 hover:text-blue-800">Spellense Design Check</a> or the <a href="/" class="text-blue-600 font-semibold underline underline-offset-2 hover:text-blue-800">Spellense Document Checker</a>.
</p>

<p>
Spellense operates as an <strong>Automated Visual Creative QA Auditor</strong> designed specifically for designers:
</p>

<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700">
  <li><strong>Optical Text Extraction:</strong> It extracts typography from flattened PNGs, JPGs, and multi-page Canva PDFs using in-memory OCR.</li>
  <li><strong>Interactive Canvas Highlighting:</strong> Instead of retyping text, red bounding boxes and underlines pinpoint typos directly over your Canva artwork.</li>
  <li><strong>Pre-Flight Checks:</strong> It audits discount arithmetic, date mismatches, safe-zone bleed margins, and WCAG contrast ratios.</li>
  <li><strong>Strict Zero-Storage Privacy:</strong> Your proprietary client graphics and unpublished marketing materials are never stored or logged.</li>
</ul>
`,
  },
  {
    slug: "why-normal-spell-checkers-miss-typos-in-images",
    title: "Why Normal Spell Checkers Miss Typos in Images (And How OCR Fixes It)",
    subtitle: "A deep dive into browser DOM text limitations, pixel grids, and the computer vision technology that catches mistakes in visual content.",
    description: "Understand the technical reasons why Grammarly, Word, and browser spell checkers cannot inspect text in images, and how in-memory OCR bridges the gap.",
    publishedAt: "2026-09-24",
    updatedAt: "2026-09-24",
    author: {
      name: "Spellense Editorial Team",
      role: "Engineering & OCR Team",
    },
    readingTime: "7 min read",
    category: "OCR Spell Checking",
    cluster: "Cluster A — OCR Spell Checking",
    tags: ["Computer Vision", "OCR", "Spell Checker Technology", "Tesseract", "Web Architecture"],
    tableOfContents: [
      { id: "the-dom-limitation", title: "How Browser Spell Checkers Actually Work" },
      { id: "inside-an-image", title: "Inside an Image: Why JPEG Pixels Have No Concept of Letters" },
      { id: "ocr-pipeline", title: "The OCR Proofreading Pipeline Explained" },
      { id: "real-world-consequences", title: "Real-World Disasters: When Visual Typos Go Live" },
      { id: "the-future", title: "The Next Generation: Multimodal AI & Creative QA" },
    ],
    ctaTool: {
      title: "Test Your Images for Hidden Typos",
      description: "Upload any PNG, JPG, or WebP graphic to Spellense. See in-memory computer vision detect text and pinpoint spelling errors in real time.",
      buttonText: "Check an Image for Typos",
      href: "/",
    },
    relatedSlugs: [
      "how-to-find-spelling-mistakes-in-scanned-pdf",
      "how-to-check-spelling-in-canva-before-publishing",
    ],
    content: `
<p class="lead text-lg text-slate-700 leading-relaxed font-medium">
You type an email, and a red squiggly line immediately appears under a misspelled word. You type a document in Google Docs, and an automatic suggestion corrects your grammar in real time. We take automated proofreading for granted—until we look at an image, poster, billboard, or PDF banner.
</p>

<p>
Why is it that the world's most sophisticated proofreading tools can't detect a glaring typo on an Instagram infographic or a scanned invoice?
</p>

<p>
The answer lies in the fundamental architectural difference between <strong>character encoding in computer memory</strong> and <strong>matrices of optical pixels</strong>. Let's look under the hood.
</p>

<hr class="my-8 border-slate-200" />

<h2 id="the-dom-limitation" class="text-2xl font-bold text-slate-900 mt-10 mb-4">How Browser Spell Checkers Actually Work</h2>

<p>
When you interact with a web page, the browser constructs the <strong>Document Object Model (DOM)</strong>. Text inside an input box, a paragraph <code>&lt;p&gt;</code>, or a content-editable <code>&lt;div&gt;</code> is stored as structured Unicode data.
</p>

<p>
For example, the word <em>"Design"</em> is stored as six discrete numerical bytes:
</p>

<div class="my-4 rounded-xl bg-slate-900 p-4 font-mono text-xs text-blue-300 overflow-x-auto">
  D = U+0044 (68) | e = U+0065 (101) | s = U+0073 (115) | i = U+0069 (105) | g = U+0067 (103) | n = U+006E (110)
</div>

<p>
Browser extensions (such as Grammarly or native spellcheck) monitor the DOM for text node mutations. When you finish typing a word, the extension takes that clean string of Unicode bytes and queries a local or remote dictionary trie. If the byte sequence doesn't match an entry in the lexicon, it registers an error and draws a squiggly line beneath that DOM node.
</p>

<h2 id="inside-an-image" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Inside an Image: Why JPEG Pixels Have No Concept of Letters</h2>

<p>
Now consider what happens when you save an image in Photoshop, Figma, or Canva.
</p>

<p>
The application converts your vector text into an RGB raster grid. An exported <code>1920 × 1080</code> banner contains <strong>2,073,600 individual pixels</strong>. Each pixel stores only three color channels: Red, Green, and Blue (e.g. <code>rgb(34, 197, 94)</code>).
</p>

<p>
To your computer and browser, that image is just a massive 2D array of numbers. There is no concept of a "word", a "sentence", or a "letter". The browser has no idea whether those pixels depict a sunset, a golden retriever, or a billboard headline reading <em>"GRAND OPENING TOMOROW"</em>.
</p>

<div class="my-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
  <h4 class="font-bold text-slate-900 text-sm">The Core Technical Gap:</h4>
  <p class="mt-1 text-xs text-slate-600 leading-relaxed">
    Traditional proofreading engines operate strictly on <strong>semantic text streams</strong>. They cannot interface with <strong>spatial color matrices</strong> without a computer vision layer.
  </p>
</div>

<h2 id="ocr-pipeline" class="text-2xl font-bold text-slate-900 mt-10 mb-4">The OCR Proofreading Pipeline Explained</h2>

<p>
To bridge the gap between pixels and vocabulary, <a href="/" class="text-blue-600 font-semibold underline underline-offset-2 hover:text-blue-800">Spellense</a> executes a specialized five-stage computer vision and lexical pipeline in memory:
</p>

<ol class="list-decimal pl-6 space-y-4 my-6 text-slate-700">
  <li>
    <strong>Image Pre-Processing & Normalization:</strong> The image buffer is decoded via canvas. Dynamic thresholding and contrast optimization enhance dark-on-light and light-on-dark contrast edges.
  </li>
  <li>
    <strong>Line & Word Segmentation:</strong> Neural network models inspect spatial clustering to locate text baselines, word boundaries, and bounding box envelopes <code>[left, top, width, height]</code>.
  </li>
  <li>
    <strong>Character Feature Extraction:</strong> Deep convolutional layers classify letterforms, resolving serifs, ascenders, descenders, and ligatures into recognized ASCII/Unicode characters.
  </li>
  <li>
    <strong>Lexical & Dialect Verification:</strong> Extracted tokens are cleaned and parsed through dual dictionaries: American English (en-US) and British English (en-GB). Brand names, country codes, and industry acronyms (like HVAC, FIFA, UAE) are cross-referenced against whitelists to eliminate false positives.
  </li>
  <li>
    <strong>Coordinate Projection:</strong> When a typo is confirmed, its bounding box coordinates are mapped back over the original canvas so the user can see exactly where the error sits on their visual creative.
  </li>
</ol>

<h2 id="real-world-consequences" class="text-2xl font-bold text-slate-900 mt-10 mb-4">Real-World Disasters: When Visual Typos Go Live</h2>

<p>
Because raster graphics bypass automated proofreading, some of the most embarrassing typos in commercial history occurred in visual formats:
</p>

<ul class="list-disc pl-6 space-y-3 my-4 text-slate-700">
  <li>
    <strong>The Billboard Blunder:</strong> A national fast-food franchise printed hundreds of highway billboards advertising <em>"100% Angus BEEF BURGERS"</em> with the word <em>"Angus"</em> accidentally misspelled as <em>"Anus"</em>. Because the billboard file was an InDesign vector export sent straight to wide-format print, no traditional spellchecker intervened.
  </li>
  <li>
    <strong>The Luxury Watch Catalog:</strong> A Swiss luxury horology house printed 20,000 hardcover annual catalogs with the word <em>"CHRONOMETER"</em> spelled with an extra 'm'. The entire print batch had to be pulped at a loss of over $80,000.
  </li>
  <li>
    <strong>Social Media Ad Rejections:</strong> Ad platforms like Meta and Google Ads penalize or reject creatives with obvious spelling mistakes, leading to higher Cost Per Click (CPC) and reduced delivery.
  </li>
</ul>

<h2 id="the-future" class="text-2xl font-bold text-slate-900 mt-10 mb-4">The Next Generation: Multimodal AI & Creative QA</h2>

<p>
Modern proofreading is expanding beyond simple dictionary lookups. With multimodal vision models (such as Google Gemini Flash), tools like Spellense can now conduct comprehensive <strong>Creative QA Audits</strong>:
</p>

<ul class="list-disc pl-6 space-y-2 my-4 text-slate-700">
  <li>Verifying that discount percentages mathematically match the stated old and new prices.</li>
  <li>Confirming that calendar dates match the day of the week.</li>
  <li>Checking for orphan asterisks that lack a corresponding footnote disclaimer.</li>
  <li>Evaluating WCAG color contrast ratios between text strokes and underlying photography.</li>
</ul>

<p>
The next time you export a design banner, flyer, or scanned contract, don't assume it's error-free just because your browser didn't complain. Run it through an OCR-based proofreader before your audience sees it.
</p>
`,
  },
];

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return [];
  return BLOG_POSTS.filter((p) => current.relatedSlugs.includes(p.slug));
}

export function getAllCategories(): string[] {
  return Array.from(new Set(BLOG_POSTS.map((p) => p.category)));
}

