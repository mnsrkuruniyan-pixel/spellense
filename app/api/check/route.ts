import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import nspell from "nspell";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import mammoth from "mammoth";
import PPTX2Json from "pptx2json";
import * as XLSX from "xlsx";
import { readFileSync, copyFileSync, existsSync } from "node:fs";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { US_TO_UK_MAP, UK_TO_US_MAP } from "@/app/us-uk-converter/dialectRules";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function loadDictionary(subFolder: string, packageName: string) {
  const candidates = [
    join(process.cwd(), "dictionaries", subFolder),
    join(process.cwd(), "node_modules", packageName),
    join(__dirname, "..", "..", "..", "dictionaries", subFolder),
    join(__dirname, "..", "..", "dictionaries", subFolder),
    join(__dirname, "..", "dictionaries", subFolder),
  ];

  for (const dir of candidates) {
    try {
      const aff = readFileSync(join(dir, "index.aff"));
      const dic = readFileSync(join(dir, "index.dic"));
      return nspell({ aff, dic });
    } catch {
      // try next candidate
    }
  }

  console.warn(`[Spellense] Dictionary files not found for ${subFolder}, using safe fallback.`);
  try {
    return nspell({ aff: "SET UTF-8\nTRY esianrtolcdugmphbyfvkwz'\n", dic: "0\n" });
  } catch {
    return {
      correct: () => true,
      suggest: () => [],
    } as unknown as ReturnType<typeof nspell>;
  }
}

const spellUS = loadDictionary("en", "dictionary-en");
const spellGB = loadDictionary("en-gb", "dictionary-en-gb");

type SpellError = {
  word: string;
  suggestion: string | null;
  index: number;
  page?: number;
};


type OcrWord = {
  text: string;
  confidence: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

type ImageMark = {
  word: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type OcrBlock = {
  paragraphs: {
    lines: {
      words: OcrWord[];
    }[];
  }[];
}[] | null;

/* =========================================================
   KNOWN VALID WORDS
   =========================================================
   These words may not always be handled correctly by a
   standard English dictionary.

   We keep this list conservative.
========================================================= */

const KNOWN_VALID_WORDS = new Set([
  /* Countries / nationalities */
  "india",
  "indian",
  "afghanistan",
  "albania",
  "algeria",
  "andorra",
  "angola",
  "argentina",
  "armenia",
  "australia",
  "austria",
  "azerbaijan",
  "bahamas",
  "bahrain",
  "bangladesh",
  "barbados",
  "belarus",
  "belgium",
  "belize",
  "benin",
  "bhutan",
  "bolivia",
  "botswana",
  "brazil",
  "brunei",
  "bulgaria",
  "burundi",
  "cambodia",
  "cameroon",
  "canada",
  "chad",
  "chile",
  "china",
  "colombia",
  "comoros",
  "congo",
  "croatia",
  "cuba",
  "cyprus",
  "denmark",
  "djibouti",
  "dominica",
  "ecuador",
  "egypt",
  "eritrea",
  "estonia",
  "ethiopia",
  "fiji",
  "finland",
  "france",
  "gabon",
  "gambia",
  "georgia",
  "germany",
  "ghana",
  "greece",
  "grenada",
  "guatemala",
  "guinea",
  "guyana",
  "haiti",
  "honduras",
  "hungary",
  "iceland",
  "indonesia",
  "iran",
  "iraq",
  "ireland",
  "israel",
  "italy",
  "jamaica",
  "japan",
  "jordan",
  "kazakhstan",
  "kenya",
  "kiribati",
  "kuwait",
  "kyrgyzstan",
  "laos",
  "latvia",
  "lebanon",
  "lesotho",
  "liberia",
  "libya",
  "liechtenstein",
  "lithuania",
  "luxembourg",
  "madagascar",
  "malawi",
  "malaysia",
  "maldives",
  "mali",
  "malta",
  "mauritania",
  "mauritius",
  "mexico",
  "micronesia",
  "moldova",
  "monaco",
  "mongolia",
  "montenegro",
  "morocco",
  "mozambique",
  "myanmar",
  "namibia",
  "nauru",
  "nepal",
  "netherlands",
  "nicaragua",
  "niger",
  "nigeria",
  "norway",
  "oman",
  "pakistan",
  "palau",
  "panama",
  "paraguay",
  "peru",
  "philippines",
  "poland",
  "portugal",
  "qatar",
  "romania",
  "russia",
  "rwanda",
  "samoa",
  "senegal",
  "serbia",
  "seychelles",
  "singapore",
  "slovakia",
  "slovenia",
  "somalia",
  "spain",
  "sudan",
  "suriname",
  "sweden",
  "switzerland",
  "syria",
  "taiwan",
  "tajikistan",
  "tanzania",
  "thailand",
  "togo",
  "tonga",
  "tunisia",
  "turkey",
  "turkmenistan",
  "tuvalu",
  "uganda",
  "ukraine",
  "uruguay",
  "uzbekistan",
  "vanuatu",
  "venezuela",
  "vietnam",
  "yemen",
  "zambia",
  "zimbabwe",
  "usa",
  "uk",
  "uae",
  "gmail",
  "email",
  "shunde",
  "sanden",
  "mansoor",
  "hisense",
  "kelon",
  "macos",
  "tcs",
  "ai",
  "nov",
  "feb",
  "dec",
  "satwa",
  "enhance",

  /* Continents & Regions */
  "africa",
  "african",
  "africas",
  "america",
  "american",
  "americas",
  "asia",
  "asian",
  "europe",
  "european",
  "antarctica",
  "oceania",
  "eurasia",
  "qingdao",

  /* Audio, Video, TV & Electronics terms */
  "atmos",
  "dolby",
  "vidaa",
  "soundbar",
  "subwoofer",
  "bluetooth",
  "chromecast",
  "airplay",
  "gameplay",
  "esports",

  /* Months */
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",

  /* Education and common document abbreviations */
  "sslc",
  "hse",
  "ba",
  "bsc",
  "bcom",
  "ma",
  "msc",
  "mcom",
  "phd",
  "tally",

  /* Indian clothing / culture */
  "saree",
  "sari",
  "salwar",
  "shalwar",
  "kameez",
  "kurta",
  "kurti",
  "dupatta",

  /* South Asian / commonly used words */
  "chai",
  "yoga",
  "diwali",
  "deepavali",
  "holi",
  "namaste",
  "ayurveda",

  /* Common food words */
  "biryani",
  "masala",
  "naan",
  "chapati",
  "roti",
  "samosa",
  "tandoori",

  /* Common names / places / brands */
  "dubai",
  "kerala",
  "mumbai",
  "delhi",
  "bangalore",
  "kochi",
  "abu",
  "dhabi",

  /* Common internet / technology names & brands */
  "google",
  "youtube",
  "instagram",
  "facebook",
  "whatsapp",
  "iphone",
  "ipad",
  "macbook",
  "android",
  "microsoft",
  "apple",
  "amazon",
  "netflix",
  "spotify",
  "twitter",
  "linkedin",
  "tiktok",
  "pinterest",
  "reddit",
  "snapchat",
  "telegram",
  "slack",
  "zoom",
  "teams",
  "notion",
  "linear",
  "asana",
  "trello",
  "jira",
  "loom",
  "figma",
  "canva",
  "adobe",
  "photoshop",
  "illustrator",
  "indesign",
  "premiere",
  "procreate",
  "blender",
  "autocad",
  "openai",
  "chatgpt",
  "gemini",
  "claude",
  "copilot",
  "anthropic",
  "deepmind",
  "midjourney",
  "spellense",

  /* Modern Web, App, and Software Engineering Terms */
  "navbar",
  "nav",
  "dropdown",
  "dropdowns",
  "checkbox",
  "checkboxes",
  "tooltip",
  "tooltips",
  "modal",
  "modals",
  "onboarding",
  "workflow",
  "workflows",
  "dashboard",
  "dashboards",
  "backend",
  "backends",
  "frontend",
  "frontends",
  "fullstack",
  "devops",
  "saas",
  "paas",
  "iaas",
  "ecommerce",
  "signin",
  "signout",
  "signup",
  "login",
  "logout",
  "subdomain",
  "subdomains",
  "metadata",
  "screenshot",
  "screenshots",
  "plugin",
  "plugins",
  "addon",
  "addons",
  "widget",
  "widgets",
  "sidebar",
  "sidebars",
  "footer",
  "footers",
  "header",
  "headers",
  "favicon",
  "favicons",
  "inline",
  "offline",
  "online",
  "sync",
  "synced",
  "syncing",
  "async",
  "viewport",
  "viewports",
  "clickable",
  "scrollable",
  "auth",
  "oauth",
  "otp",
  "passcode",
  "passcodes",
  "pin",
  "pins",
  "captcha",
  "recaptcha",
  "webhook",
  "webhooks",
  "websocket",
  "websockets",
  "crud",
  "sdk",
  "sdks",
  "api",
  "apis",
  "ui",
  "ux",
  "gui",
  "cli",
  "url",
  "urls",
  "uri",
  "uris",
  "http",
  "https",
  "ssl",
  "tls",
  "ssh",
  "dns",
  "ip",
  "vpn",
  "vpns",
  "cdn",
  "cdns",
  "seo",
  "sem",
  "cta",
  "ctas",
  "kpi",
  "kpis",
  "faq",
  "faqs",
  "qa",
  "repo",
  "repos",
  "git",
  "github",
  "gitlab",
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "nodejs",
  "node",
  "react",
  "reactjs",
  "nextjs",
  "vue",
  "vuejs",
  "angular",
  "svelte",
  "tailwind",
  "tailwindcss",
  "bootstrap",
  "json",
  "yaml",
  "yml",
  "xml",
  "sql",
  "nosql",
  "postgres",
  "postgresql",
  "mysql",
  "sqlite",
  "mongodb",
  "redis",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "vercel",
  "netlify",
  "supabase",
  "firebase",
  "stripe",
  "paypal",
  "razorpay",
  "paytm",
  "phonepe",

  /* File Formats & Extensions */
  "pdf",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "xlsx",
  "xls",
  "csv",
  "tsv",
  "txt",
  "rtf",
  "epub",
  "png",
  "jpg",
  "jpeg",
  "svg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "tiff",
  "mp3",
  "mp4",
  "wav",
  "m4a",
  "ogg",
  "flac",
  "avi",
  "mov",
  "mkv",
  "webm",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",

  /* Currencies, Units & Business Terms */
  "usd",
  "inr",
  "aed",
  "eur",
  "gbp",
  "aud",
  "cad",
  "sgd",
  "jpy",
  "cny",
  "sar",
  "qar",
  "kwd",
  "omr",
  "bhd",
  "b2b",
  "b2c",
  "d2c",
  "roi",
  "cac",
  "ltv",
  "arr",
  "mrr",
  "ebitda",
  "po",
  "pr",
  "rfp",
  "nda",
  "sla",
  "crm",
  "erp",
  "pos",
  "sku",
  "skus",
  "vat",
  "gst",
  "tax",
  "invoice",
  "invoices",
  "proforma",
  "px",
  "pt",
  "rem",
  "em",
  "vh",
  "vw",
  "km",
  "cm",
  "mm",
  "kg",
  "gm",
  "mg",
  "ml",
  "oz",
  "lb",
  "lbs",
  "kb",
  "mb",
  "gb",
  "tb",
  "pb",
  "hz",
  "khz",
  "mhz",
  "ghz",
  "fps",
  "kph",
  "mph",
  "rpm",
  "ms",
  "sec",
  "secs",
  "min",
  "mins",
  "hr",
  "hrs",
  "dpi",

  /* Additional Indian & Middle Eastern Cities / States / Culture */
  "kozhikode",
  "calicut",
  "thiruvananthapuram",
  "trivandrum",
  "thrissur",
  "malappuram",
  "kannur",
  "kollam",
  "palakkad",
  "alappuzha",
  "kottayam",
  "kasaragod",
  "wayanad",
  "idukki",
  "pathanamthitta",
  "bengaluru",
  "chennai",
  "hyderabad",
  "kolkata",
  "pune",
  "ahmedabad",
  "jaipur",
  "surat",
  "lucknow",
  "kanpur",
  "nagpur",
  "indore",
  "thane",
  "bhopal",
  "visakhapatnam",
  "patna",
  "vadodara",
  "ghaziabad",
  "ludhiana",
  "agra",
  "nashik",
  "faridabad",
  "meerut",
  "rajkot",
  "varanasi",
  "srinagar",
  "aurangabad",
  "amritsar",
  "ranchi",
  "coimbatore",
  "gwalior",
  "vijayawada",
  "jodhpur",
  "madurai",
  "raipur",
  "kota",
  "guwahati",
  "chandigarh",
  "mysore",
  "mysuru",
  "gurgaon",
  "gurugram",
  "noida",
  "mangalore",
  "mangaluru",
  "sharjah",
  "ajman",
  "fujairah",
  "doha",
  "riyadh",
  "jeddah",
  "dammam",
  "khobar",
  "manama",
  "muscat",
  "onam",
  "vishu",
  "eid",
  "ramadan",
  "iftar",
  "kudumbashree",
  "panchayat",
  "taluk",
  "kseb",
  "malayalam",
  "malayali",
  "mallu",
  "naadan",

  /* Common Global, Indian, and Arabic Names */
  "rahul", "rohit", "amit", "anil", "sunil", "suresh", "ramesh", "vijay", "ajay", "raj",
  "rajesh", "vikram", "vivek", "arun", "varun", "kiran", "manoj", "sanjay", "deepak", "pradeep",
  "praveen", "sandeep", "anoop", "akhil", "nikhil", "arjun", "karan", "vishnu", "krishna", "shiva",
  "ganesh", "mahesh", "dinesh", "naresh", "rakesh", "mukesh", "harish", "girish", "satish", "ashok",
  "vinod", "pramod", "anand", "alok", "sid", "siddharth", "aditya", "abhishek", "anurag", "gaurav",
  "saurabh", "mayank", "ankit", "sumit", "pankaj", "neeraj", "dheeraj", "suraj", "tarun", "chetan",
  "hemant", "bharat", "dev", "mohan", "sohan", "rohan", "sooraj", "akash", "prashant", "subhash",
  "sudhir", "sudhanshu", "shashi", "prakash", "chandra", "ravi", "shyam", "govind", "gopal", "jagdish",
  "kailash", "madhav", "bhaskar", "kamal", "vimal", "nirmal", "uttam", "kalyan", "harsha", "charan",
  "teja", "karthik", "kartik", "saravanan", "murugan", "senthil", "vignesh", "venkat", "srinivas", "raghu",
  "bala", "prasad", "sreejith", "sujith", "renjith", "sanju", "shibu", "biju", "saji", "shaji",
  "saboo", "vipin", "jithin", "midhun", "nithin", "amal", "anandhu", "athul", "gokul", "vishak",
  "abijith", "abhijith", "sreerag", "vaisakh", "unni", "nandhu", "priya", "pooja", "neha", "sneha",
  "anjali", "anita", "sunita", "kavitha", "anitha", "deepa", "divya", "vidya", "ramya", "soumya",
  "remya", "sandhya", "reshma", "archana", "swathi", "swetha", "meera", "radha", "lakshmi", "parvathi",
  "saraswati", "durga", "bhavana", "anupama", "malini", "shalini", "rekha", "hema", "seema", "reena",
  "meena", "tina", "riya", "diya", "siya", "kavya", "navya", "dhanya", "aiswarya", "aishwarya",
  "athira", "aswathy", "anu", "arya", "ammu", "anju", "aparna", "anagha", "gopika", "devika",
  "haritha", "surabhi", "keerthi", "shruthi", "sruthi", "saranya",
  "mohammed", "muhammad", "mohamed", "ahmed", "ahmad", "ali", "hassan", "hussein", "omar", "uthman",
  "abdul", "abdullah", "ibrahim", "ismail", "yusuf", "tariq", "khalid", "waleed", "rashid", "saeed",
  "salem", "hamad", "zayed", "farhan", "faisal", "rizwan", "imran", "salman", "irfan", "asif",
  "arif", "shafiq", "rafiq", "mushtaq", "mustafa", "murtaza", "nabeel", "javed", "naveed", "zaheer",
  "shahid", "waseem", "tanveer", "kamran", "adnan", "zubair", "bilal", "hamza", "anas", "ayman",
  "sami", "kareem", "fatima", "ayesha", "khadija", "zainab", "mariam", "maryam", "yasmin", "amira",
  "layla", "samira", "farida", "bushra", "nadiya", "nadia", "hana", "huda", "reem", "nour",
  "noor", "dina", "rana", "rania", "maha", "mona",
]);

/* =========================================================
   KNOWN ACRONYMS & ABBREVIATIONS
   ========================================================= */

const KNOWN_ACRONYMS = new Set([
  // Tech & Computing
  "pdf", "url", "http", "https", "seo", "json", "api", "html", "css", "xml", "csv", "sql", "svg", "png", "jpg", "jpeg", "webp", "gif", "mp4", "mp3", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "zip", "rar", "tar", "gz", "exe", "apk", "ios", "ai", "ml", "nlp", "llm", "ui", "ux", "gui", "cli", "sdk", "ide", "git", "ssh", "ssl", "tls", "vpn", "dns", "ip", "tcp", "udp", "lan", "wan", "wlan", "wifi", "mac", "pc", "os", "ram", "rom", "cpu", "gpu", "tpu", "ssd", "hdd", "usb", "hdmi", "vga", "sim", "esim", "gps", "nfc", "rfid", "led", "lcd", "oled", "qled", "dts", "hdr", "hdr10", "uhd", "vrr", "allm", "earc", "arc", "iot", "saas", "paas", "iaas", "pwa", "spa", "ssr", "ssg", "cdn", "db", "rdbms", "crud", "jwt", "oauth", "rest", "soap", "dom", "bom", "cors", "csrf", "xss", "ddos", "npm", "yarn", "pnpm", "node", "php", "py", "rb", "cpp", "cs", "fs", "go", "rs", "ts", "js",
  // Business, Finance & Corporate
  "ceo", "cto", "cfo", "coo", "cmo", "cio", "cso", "cpo", "hr", "pr", "qa", "qc", "rd", "it", "cs", "cx", "b2b", "b2c", "d2c", "kpi", "roi", "okr", "nda", "sla", "sop", "mou", "po", "rfp", "rfq", "gst", "vat", "tin", "pan", "kyc", "ssn", "ein", "cin", "iban", "swift", "bic", "ifsc", "neft", "rtgs", "imps", "upi", "atm", "pin", "otp", "cvv", "pos", "ebitda", "ipo", "pnl", "yoy", "mom", "qoq", "fy", "cy", "corp", "inc", "ltd", "llc", "llp", "plc", "pvt", "gmbh",
  // Education & Academic Degrees
  "sslc", "hse", "cbse", "icse", "ba", "bsc", "bcom", "bba", "bca", "btech", "be", "barch", "bed", "bpharm", "ma", "msc", "mcom", "mba", "mca", "mtech", "me", "med", "mphil", "phd", "md", "ms", "mbbs", "bds", "ca", "cma", "cs", "cfa", "cpa", "acca", "ielts", "toefl", "gre", "gmat", "sat", "cat", "gate",
  // Common Abbreviations & Units
  "am", "pm", "bc", "ad", "est", "pst", "cst", "mst", "gmt", "utc", "cet", "ist", "id", "ok", "tv", "cv", "resume", "faq", "sms", "mms", "vip", "iq", "eq", "ac", "dc", "hq", "vs", "etc", "eg", "ie", "nb", "ps", "eta", "etd", "tba", "tbd", "fyi", "asap", "diy", "qna",
  // Organizations & Places
  "usa", "uk", "uae", "eu", "un", "who", "wto", "imf", "unesco", "unicef", "nasa", "isro", "esa", "nato", "fbi", "cia", "interpol", "iso", "ieee", "ansi", "w3c", "fifa", "icc", "ioc", "bcci", "kseb", "tcs", "cts", "wipro", "ibm", "bhel", "ongc", "lic"
]);

/* =========================================================
   COMMON TYPO DICTIONARY (100% ACCURATE CORRECTIONS)
   ========================================================= */

const COMMON_TYPO_MAP: Record<string, string> = {
  /* Transpositions & Fast Typing Slips */
  teh: "the",
  adn: "and",
  waht: "what",
  cna: "can",
  yuo: "you",
  wiht: "with",
  taht: "that",
  thsi: "this",
  htis: "this",
  fro: "for",
  ot: "to",
  si: "is",
  ti: "it",
  ahve: "have",
  hvae: "have",
  woudl: "would",
  coudl: "could",
  shoudl: "should",
  abotu: "about",
  becuase: "because",
  beacuse: "because",
  bacause: "because",

  /* Frequent English Misspellings */
  definately: "definitely",
  definitly: "definitely",
  defanitely: "definitely",
  recieve: "receive",
  recieved: "received",
  recieving: "receiving",
  seperate: "separate",
  seperated: "separated",
  seperation: "separation",
  occured: "occurred",
  occurence: "occurrence",
  occuring: "occurring",
  happend: "happened",
  happned: "happened",
  prefered: "preferred",
  transfered: "transferred",
  refered: "referred",
  stoped: "stopped",
  droped: "dropped",
  untill: "until",
  wierd: "weird",
  alot: "a lot",
  truely: "truly",
  goverment: "government",
  enviroment: "environment",
  tommorow: "tomorrow",
  tommorrow: "tomorrow",
  calender: "calendar",
  beleive: "believe",
  beleived: "believed",
  acheive: "achieve",
  acheived: "achieved",
  acheivement: "achievement",
  recommand: "recommend",
  recomended: "recommended",
  recomending: "recommending",
  thier: "their",
  writting: "writing",
  writen: "written",
  suprise: "surprise",
  suprised: "surprised",
  fourty: "forty",
  nineth: "ninth",
  embarass: "embarrass",
  embarassed: "embarrassed",
  embarassing: "embarrassing",
  priviledge: "privilege",
  maintainance: "maintenance",
  millenium: "millennium",
  noticable: "noticeable",
  perserverance: "perseverance",
  posession: "possession",
  publically: "publicly",
  questionaire: "questionnaire",
  religous: "religious",
  resistence: "resistance",
  rythm: "rhythm",
  sieze: "seize",
  succesful: "successful",
  succesfully: "successfully",
  sucess: "success",
  supercede: "supersede",
  tatoo: "tattoo",
  tendancy: "tendency",
  unforseen: "unforeseen",
  unfortunatly: "unfortunately",
  vaccuum: "vacuum",
  vehical: "vehicle",
  vicious: "vicious",
  yeild: "yield",
  accomodate: "accommodate",
  accomodation: "accommodation",
  begining: "beginning",
  collegue: "colleague",
  collegues: "colleagues",
  concious: "conscious",
  curiosity: "curiosity",
  disapear: "disappear",
  disapoint: "disappoint",
  foriegn: "foreign",
  grammer: "grammar",
  guarentee: "guarantee",
  harrass: "harass",
  hiearchy: "hierarchy",
  humourous: "humorous",
  ignorant: "ignorant",
  independant: "independent",
  inteligence: "intelligence",
  knowlege: "knowledge",
  lisence: "license",
  mischievious: "mischievous",
  neccessary: "necessary",
  necessery: "necessary",
  occassion: "occasion",
  occassionally: "occasionally",
  paralell: "parallel",
  peice: "piece",
  pronounciation: "pronunciation",
  refelect: "reflect",
  relevent: "relevant",
  restaraunt: "restaurant",
  shedule: "schedule",
  speach: "speech",
  tounge: "tongue",
  unecessary: "unnecessary",
  usefull: "useful",
  valuble: "valuable",
  wellcome: "welcome",
  wich: "which",
  woops: "oops",

  /* Document, Design, and Product Terms */
  spellign: "spelling",
  spellcheck: "spell check",
  eror: "error",
  erors: "errors",
  documnet: "document",
  documnets: "documents",
  chekc: "check",
  imgae: "image",
  imgaes: "images",
  desgin: "design",
  fals: "false",
  tru: "true",
  caan: "can",
  doone: "done",
  thet: "the",
  leeder: "leader",
  comme: "come",
  heare: "here",
  mispell: "misspell",
  mispelled: "misspelled",
  mispelling: "misspelling",
  adverisement: "advertisement",
  advertisment: "advertisement",
  buisness: "business",
  busines: "business",
  persentage: "percentage",
  analyis: "analysis",
  flawles: "flawless",
  dashbaord: "dashboard",
  accoutn: "account",
  pasword: "password",
  passward: "password",
  subscrition: "subscription",
  upgarde: "upgrade",
  settigns: "settings",
  settngs: "settings",
  notifcation: "notification",
  notifcations: "notifications",
  infomation: "information",
  messge: "message",
  messges: "messages",
  clcik: "click",
  downlaod: "download",
  uplod: "upload",
  uplode: "upload",
  uploded: "uploaded",
  prevuew: "preview",
  perview: "preview",

  /* High-frequency business, document, and technical misspellings */
  documnt: "document",
  documnts: "documents",
  reprot: "report",
  reprots: "reports",
  mangr: "manager",
  mngr: "manager",
  mangers: "managers",
  finacial: "financial",
  finace: "finance",
  suport: "support",
  suported: "supported",
  suporting: "supporting",
  servises: "services",
  servise: "service",
  quallity: "quality",
  qualiti: "quality",
  asistance: "assistance",
  asist: "assist",
  custmer: "customer",
  custmers: "customers",
  managment: "management",
  aplication: "application",
  aplications: "applications",
  certifcate: "certificate",
  certifcates: "certificates",
  guidlines: "guidelines",
  guidline: "guideline",
  conditons: "conditions",
  conditon: "condition",
  inconvinience: "inconvenience",
  inconvienent: "inconvenient",
  confidensial: "confidential",
  industery: "industry",
  industies: "industries",
  inovation: "innovation",
  inovative: "innovative",
  tehnology: "technology",
  technolgy: "technology",
  compnay: "company",
  compnies: "companies",
  webiste: "website",
  webistes: "websites",
  quik: "quick",
  lazi: "lazy",
  ovr: "over",
  jumpd: "jumped",
  meetng: "meeting",
  meetngs: "meetings",
  provid: "provide",
  provids: "provides",
  provded: "provided",
  employes: "employees",
  employe: "employee",
  erorr: "error",
  erorrs: "errors",
  invois: "invoice",
  invoise: "invoice",
  invoices: "invoices",
  recipt: "receipt",
  reciept: "receipt",
  cancle: "cancel",
  cancled: "canceled",
  canclled: "cancelled",
  submited: "submitted",
  submition: "submission",
  procced: "proceed",
  procede: "proceed",
  conection: "connection",
  comunication: "communication",
  experiance: "experience",
  experence: "experience",
  descripion: "description",
  discription: "description",
  catagory: "category",
  catagories: "categories",
  oppurtunity: "opportunity",
  oppurtunities: "opportunities",
  oportunity: "opportunity",
  permenant: "permanent",
  temporarely: "temporarily",
  responsiblity: "responsibility",
  responsibilty: "responsibility",
  posible: "possible",
  probly: "probably",
  definate: "definite",
  originaly: "originally",
  seperately: "separately",
  automaticly: "automatically",
  basicly: "basically",
  yesterdy: "yesterday",
  requirment: "requirement",
  requirments: "requirements",
  proffesional: "professional",
  proffesionals: "professionals",
  perfomance: "performance",
  agreemnt: "agreement",
  agrement: "agreement",
  devoloper: "developer",
  developper: "developer",
  programer: "programmer",
  computr: "computer",
  sofware: "software",
  harware: "hardware",
  netwok: "network",
  internt: "internet",
  platfrom: "platform",
  soluton: "solution",
  solutuon: "solution",
  strategi: "strategy",
  stradegy: "strategy",
  plannig: "planning",
  organazation: "organization",
  organistion: "organisation",
  operaton: "operation",
  operatons: "operations",
  standars: "standards",
  acuracy: "accuracy",
  accurat: "accurate",
  effecient: "efficient",
  eficient: "efficient",
  efective: "effective",
  avaliable: "available",
  availabe: "available",
  avialable: "available",
  verfication: "verification",
  authenication: "authentication",
  welcom: "welcome",

  /* Missing apostrophe contractions */
  dont: "don't",
  didnt: "didn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  doesnt: "doesn't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  havent: "haven't",
  hasnt: "hasn't",
  hadnt: "hadn't",
};

/* =========================================================
   HIGH-CONFIDENCE OCR CORRECTIONS
   ========================================================= */

const SAFE_CORRECTIONS: Record<string, string> = {
  caan: "can",
  doone: "done",
  thet: "the",
  leeder: "leader",
  comme: "come",
  heare: "here",
};

/* =========================================================
   SAFE WORD SPLITS
   ========================================================= */

const SAFE_SPLITS: Record<string, string> = {
  sofar: "so far",
  alot: "a lot",
  inthe: "in the",
  onthe: "on the",
  atthe: "at the",
  tothe: "to the",
  forthe: "for the",
  fromthe: "from the",
  withthe: "with the",
  ofthe: "of the",
  asthe: "as the",
  isthe: "is the",
  andthe: "and the",
  thankyou: "thank you",
  everytime: "every time",
  eachother: "each other",
  infront: "in front",
  abit: "a bit",
  atleast: "at least",
};

/* =========================================================
   OCR NOISE WORDS
   ========================================================= */

const IGNORE_WORDS = new Set([
  "ing",
  "www",
  "http",
  "https",
]);

/* =========================================================
   COMMON ENGLISH WORD SCORES
   ========================================================= */

const COMMON_WORD_SCORES: Record<string, number> = {
  the: 100,
  be: 100,
  to: 100,
  of: 100,
  and: 100,
  a: 100,
  in: 100,
  that: 100,
  is: 100,
  it: 100,
  for: 100,
  as: 100,
  was: 100,
  with: 100,
  on: 100,
  at: 100,
  by: 100,
  this: 100,
  from: 100,
  or: 100,
  an: 100,

  have: 95,
  has: 95,
  had: 95,
  not: 95,
  but: 95,
  what: 95,
  all: 95,
  were: 95,
  when: 95,
  we: 95,
  there: 95,
  their: 95,
  they: 95,
  you: 95,
  your: 95,
  can: 95,
  could: 95,
  would: 95,
  should: 95,
  which: 95,

  come: 95,
  here: 95,
  hear: 88,
  leader: 95,
  done: 95,
  over: 95,

  so: 95,
  far: 95,
  fast: 90,

  word: 90,
  words: 90,
  good: 90,
  great: 90,
  design: 90,
  check: 90,
  spelling: 90,
  english: 90,

  image: 90,
  images: 90,
  file: 90,
  files: 90,
  document: 95,
  documents: 95,
  report: 95,
  reports: 95,
  text: 90,
  page: 90,
  pages: 90,
  service: 95,
  services: 95,
  quality: 95,
  support: 95,
  financial: 95,
  assistance: 95,
  customer: 95,
  customers: 95,
  application: 95,
  management: 95,
  company: 95,
  technology: 95,
  industry: 95,
  information: 95,
  meeting: 95,
  provide: 95,
  employee: 95,
  employees: 95,
  quick: 95,
  lazy: 95,
  jumped: 95,
  website: 95,
  certificate: 95,
  guidelines: 95,
  conditions: 95,
  error: 95,
  errors: 95,
  manager: 95,
};

/* =========================================================
   NORMALIZE WORD
   ========================================================= */

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

/* =========================================================
   PRESERVE ORIGINAL CASE
   ========================================================= */

function preserveCase(
  original: string,
  corrected: string
): string {
  if (!corrected) {
    return corrected;
  }

  /* ALL CAPS */
  if (original === original.toUpperCase() && original.length > 1) {
    return corrected.toUpperCase();
  }

  /* First letter uppercase */
  if (
    original.length > 0 &&
    original[0] === original[0].toUpperCase()
  ) {
    if (corrected.includes(" ")) {
      return corrected
        .split(" ")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
        .join(" ");
    }
    return corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }

  return corrected.toLowerCase();
}

/* =========================================================
   DAMERAU-LEVENSHTEIN DISTANCE
   (Includes adjacent character transpositions like teh -> the)
   ========================================================= */

function damerauLevenshtein(
  a: string,
  b: string
): number {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  const al = aa.length;
  const bl = bb.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        aa[i - 1] === bb[j - 2] &&
        aa[i - 2] === bb[j - 1]
      ) {
        matrix[i][j] = Math.min(
          matrix[i][j],
          matrix[i - 2][j - 2] + 1
        );
      }
    }
  }

  return matrix[al][bl];
}

/* =========================================================
   SENTENCE BOUNDARY DETECTION
   ========================================================= */

function isSentenceStart(
  text: string,
  index: number
): boolean {
  let i = index - 1;
  while (i >= 0 && /\s/.test(text[i])) {
    if (text[i] === "\n" || text[i] === "\r") {
      return true;
    }
    i--;
  }
  if (i < 0) {
    return true;
  }
  return [".", "?", "!", ":", ";", "\"", "'", "“", "‘", "(", "[", "{", "*", "-", "—", "–"].includes(text[i]);
}


/* =========================================================
   HYPHENATED COMPOUND WORD CHECK
   ========================================================= */

function isValidHyphenatedWord(word: string, dialect = "en-US"): boolean {
  if (!word.includes("-")) {
    return false;
  }
  const parts = word.split("-");
  if (parts.length < 2 || parts.some((p) => !p)) {
    return false;
  }
  return parts.every((p) => isValidEnglishWord(p, dialect));
}

/* =========================================================
   VALID ENGLISH WORD
   =========================================================
   Accept:
   - US English (or British English when dialect is en-GB)
   - Known valid words & modern tech vocabulary
   - Known acronyms & abbreviations
   - Valid hyphenated compounds (user-friendly, real-time)
   - Contractions and possessives (user's, company's)
========================================================= */

function isValidEnglishWord(
  word: string,
  dialect = "en-US"
): boolean {
  const clean = normalizeWord(word);

  if (!clean) {
    return false;
  }

  if (clean === "a" || clean === "i") {
    return true;
  }

  /* Known acronyms (e.g. PDF, URL, API, SEO, USA, UAE, UK, HTML, CSS, FAQ) */
  if (KNOWN_ACRONYMS.has(clean)) {
    return true;
  }

  /* Known valid special words, countries, names */
  if (KNOWN_VALID_WORDS.has(clean)) {
    return true;
  }

  /* Hyphenated compound where all parts are valid English words */
  if (clean.includes("-") && isValidHyphenatedWord(clean, dialect)) {
    return true;
  }

  /* Contraction or possessive check: user's, company's, students' */
  if (clean.endsWith("'s")) {
    const base = clean.slice(0, -2);
    if (isValidEnglishWord(base, dialect)) {
      return true;
    }
  }
  if (clean.endsWith("'")) {
    const base = clean.slice(0, -1);
    if (isValidEnglishWord(base, dialect)) {
      return true;
    }
  }

  /* Check dictionary based on selected dialect */
  const dict = dialect === "en-GB" ? spellGB : spellUS;
  if (dict.correct(clean)) {
    return true;
  }
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (dict.correct(capitalized)) {
    return true;
  }
  return false;
}

const VALID_TWO_LETTER_WORDS = new Set([
  "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if", "in", "is", "it",
  "me", "my", "no", "of", "ok", "on", "or", "ox", "so", "to", "up", "us", "we",
  "id", "tv", "cv", "ad", "pm", "am", "ai", "hr", "pr", "qa", "ui", "ux", "ip", "os", "pc", "vs", "re"
]);

function getLowConfidenceOcrWords(
  blocks: OcrBlock
): Set<string> {
  const lowConfidenceWords = new Set<string>();

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const clean = normalizeWord(word.text);

          if (clean && word.confidence < 70) {
            lowConfidenceWords.add(clean);
          }
        }
      }
    }
  }

  return lowConfidenceWords;
}

/* =========================================================
   REASONABLE OCR TOKEN
   ========================================================= */

function isReasonableWord(
  word: string,
  isDigitalText = true,
  original = word
): boolean {
  const clean = normalizeWord(word);

  if (!clean) {
    return false;
  }

  /* Ignore known OCR fragments */
  if (IGNORE_WORDS.has(clean)) {
    return false;
  }

  /* Only alphabetic words & standard punctuation */
  if (!/^[a-z'-]+$/i.test(clean)) {
    return false;
  }

  /* Don't flag random single letters except A and I */
  if (clean.length === 1 && clean !== "a" && clean !== "i") {
    return false;
  }

  // In OCR mode (scanned PDFs & raster graphics), aggressively filter out non-word OCR artifacts & foreign script hallucinations:
  if (!isDigitalText) {
    // Isolated 2-letter tokens in OCR that are not standard 2-letter English words/abbreviations (e.g. ce, eo, se, ti, fa, lo)
    if (clean.length === 2 && !VALID_TWO_LETTER_WORDS.has(clean)) {
      return false;
    }

    // Capital J followed by lowercase consonant (e.g. "Jto", "Jm", "Jk" from checkboxes, bullets, or Arabic strokes)
    if (/^[jJ][b-df-hj-np-tv-z]/.test(original)) {
      return false;
    }

    // Words of 4+ characters with no vowels at all
    if (clean.length >= 4 && !/[aeiouy]/i.test(clean)) {
      return false;
    }

    // Impossible English consonant cluster endings in OCR (e.g. "usgd", "doasll", "zpt")
    if (/(?:sgd|sll|zpt|qwt|bcd|fgk)$/i.test(clean)) {
      return false;
    }

    // Impossible consonant clusters never found in English words (e.g. "cg" in "acgyll", "qk", "qx", etc.)
    if (/(?:cg|cj|cq|cv|cw|cx|cz|bk|bq|bx|bz|df|dk|dp|dq|dt|dx|dz|fg|fk|fq|fv|fx|fz|gq|gx|gz|hx|hz|jb|jc|jd|jf|jg|jh|jj|jk|jl|jm|jn|jp|jq|jr|js|jt|jv|jw|jx|jy|jz|kq|kx|kz|pq|px|pz|qb|qc|qd|qe|qf|qg|qh|qi|qj|qk|ql|qm|qn|qo|qp|qq|qr|qs|qt|qv|qw|qx|qy|qz|sx|sz|tb|td|tg|tj|tq|tv|tx|tz|vb|vc|vd|vf|vg|vh|vj|vk|vl|vm|vn|vp|vq|vr|vs|vt|vv|vw|vx|vy|vz|wq|wx|wz|xb|xc|xd|xf|xg|xh|xj|xk|xm|xn|xp|xq|xr|xs|xt|xv|xw|xx|xy|xz|zb|zc|zd|zf|zg|zh|zj|zk|zl|zm|zn|zp|zq|zr|zs|zt|zv|zw|zx|zy|zz)/i.test(clean)) {
      return false;
    }

    // Impossible vowel-consonant combinations from Arabic/foreign OCR noise (e.g. "rouwl")
    if (/(?:ouwl|ouu|aee)/i.test(clean)) {
      return false;
    }
  }

  return true;
}

function isLikelyNamedOrAcronym(
  word: string,
  dialect = "en-US"
): boolean {
  // CamelCase or PascalCase (internal capital letter): iPhone, MacBook, YouTube, GitHub, JavaScript, NextJS, PowerPoint
  if (/^[a-zA-Z]*[a-z][A-Z][a-zA-Z]*$/.test(word)) {
    return true;
  }
  // All-caps word: if it's a known acronym or a valid English word in dictionary, treat as valid/acronym
  if (/^[A-Z]{2,}$/.test(word)) {
    const clean = normalizeWord(word);
    if (KNOWN_ACRONYMS.has(clean) || isValidEnglishWord(clean, dialect)) {
      return true;
    }
    // If not a known acronym and not a valid English word (e.g. REPROT, DOCUMNT, ERORR), it IS a typo!
    return false;
  }
  // Contains @ or .
  if (/[@.]/.test(word)) {
    return true;
  }
  return false;
}

/* =========================================================
   GET SUGGESTIONS FROM BOTH DICTIONARIES
   ========================================================= */

function getAllSuggestions(
  word: string,
  dialect = "en-US"
): string[] {
  const clean = normalizeWord(word);
  const suggestions = new Set<string>();

  const primary = dialect === "en-GB" ? spellGB : spellUS;
  const secondary = dialect === "en-GB" ? spellUS : spellGB;

  const primarySuggestions = primary.suggest(clean) || [];
  for (const suggestion of primarySuggestions) {
    const normalized = normalizeWord(suggestion);
    if (normalized) {
      suggestions.add(normalized);
    }
  }

  if (suggestions.size < 5) {
    const secondarySuggestions = secondary.suggest(clean) || [];
    for (const suggestion of secondarySuggestions) {
      const normalized = normalizeWord(suggestion);
      if (normalized) {
        suggestions.add(normalized);
      }
    }
  }

  return Array.from(suggestions);
}

/* =========================================================
   RANK SUGGESTIONS
   ========================================================= */

function rankSuggestions(
  original: string,
  suggestions: string[],
  dialect = "en-US"
): string | null {
  const cleanOriginal = normalizeWord(original);

  if (!suggestions.length) {
    return null;
  }

  const ranked = suggestions
    .filter((candidate) => {
      if (!candidate) return false;
      const cleanCandidate = normalizeWord(candidate);
      if (!cleanCandidate || cleanCandidate === cleanOriginal) return false;
      if (!/^[a-z'-]+$/i.test(cleanCandidate)) return false;
      return isValidEnglishWord(cleanCandidate, dialect);
    })
    .map((candidate) => {
      const cleanCandidate = normalizeWord(candidate);
      const distance = damerauLevenshtein(cleanOriginal, cleanCandidate);

      let score = 0;
      score -= distance * 30;

      // Bonus for keeping same first letter
      if (cleanCandidate[0] === cleanOriginal[0]) {
        score += 15;
      }

      // Bonus for keeping same last letter
      if (cleanCandidate.slice(-1) === cleanOriginal.slice(-1)) {
        score += 10;
      }

      // High-frequency common English words bonus
      score += COMMON_WORD_SCORES[cleanCandidate] ?? 0;

      // Penalize large length differences
      score -= Math.abs(cleanOriginal.length - cleanCandidate.length) * 5;

      return {
        candidate: cleanCandidate,
        score,
        distance,
      };
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance);

  if (!ranked.length) {
    return null;
  }

  return ranked[0].candidate;
}

/* =========================================================
   BEST CORRECTION
   ========================================================= */

function getBestCorrection(
  original: string,
  cleanWord = original,
  dialect = "en-US"
): string | null {
  const clean = normalizeWord(cleanWord);

  if (!clean || clean.length < 2) {
    return null;
  }

  if (IGNORE_WORDS.has(clean)) {
    return null;
  }

  if (isValidEnglishWord(clean, dialect)) {
    return null;
  }

  // Dialect-specific accurate conversions (e.g. US "center" -> UK "centre", UK "colour" -> US "color")
  if (dialect === "en-GB" && US_TO_UK_MAP[clean]) {
    return preserveCase(original, US_TO_UK_MAP[clean]);
  }
  if (dialect === "en-US" && UK_TO_US_MAP[clean]) {
    return preserveCase(original, UK_TO_US_MAP[clean]);
  }

  // Instant high-confidence correction from typo map
  if (COMMON_TYPO_MAP[clean]) {
    return preserveCase(original, COMMON_TYPO_MAP[clean]);
  }

  // High-confidence OCR correction
  if (SAFE_CORRECTIONS[clean]) {
    return preserveCase(original, SAFE_CORRECTIONS[clean]);
  }

  // Word splitting (e.g. "sofar" -> "so far", "thankyou" -> "thank you")
  if (SAFE_SPLITS[clean]) {
    return preserveCase(original, SAFE_SPLITS[clean]);
  }

  // Handle hyphenated compound parts (e.g. "user-freindly" -> "user-friendly")
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts.length >= 2) {
      const correctedParts = parts.map((part) => {
        if (isValidEnglishWord(part, dialect)) return part;
        return getBestCorrection(part, part, dialect) || part;
      });
      const combined = correctedParts.join("-");
      if (combined !== clean && isValidHyphenatedWord(combined, dialect)) {
        return preserveCase(original, combined);
      }
    }
  }

  // Handle possessives (e.g. "compnay's" -> check "compnay")
  if (clean.endsWith("'s")) {
    const base = clean.slice(0, -2);
    const baseCorrection = getBestCorrection(base, base, dialect);
    if (baseCorrection) {
      return preserveCase(original, `${baseCorrection}'s`);
    }
  }

  // Split-word check: e.g. "everytime" -> "every time"
  if (clean.length >= 6) {
    for (let i = 3; i <= clean.length - 3; i++) {
      const p1 = clean.slice(0, i);
      const p2 = clean.slice(i);
      if (isValidEnglishWord(p1, dialect) && isValidEnglishWord(p2, dialect)) {
        return preserveCase(original, `${p1} ${p2}`);
      }
    }
  }

  // Ask dictionaries
  const suggestions = getAllSuggestions(clean, dialect);
  if (!suggestions.length) {
    return null;
  }

  const best = rankSuggestions(clean, suggestions, dialect);
  if (!best) {
    return null;
  }

  const distance = damerauLevenshtein(clean, normalizeWord(best));
  const maxDistance = clean.length <= 4 ? 2 : clean.length <= 7 ? 3 : 4;

  if (distance > maxDistance) {
    return null;
  }

  return preserveCase(original, best);
}

/* =========================================================
   OCR & DOCUMENT WORD EXTRACTION
   ========================================================= */

function getWords(text: string) {
  // Mask URLs (http://..., https://...)
  let masked = text.replace(/https?:\/\/[^\s]+/gi, (m) => " ".repeat(m.length));
  // Mask www. domains
  masked = masked.replace(/www\.[^\s]+/gi, (m) => " ".repeat(m.length));
  // Mask email addresses
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => " ".repeat(m.length));
  // Mask hex colors: #fff, #ffffff
  masked = masked.replace(/#[0-9a-fA-F]{3,8}\b/g, (m) => " ".repeat(m.length));
  // Mask numbers attached to units/ordinals/dimensions: 1080p, 500mg, 100km, 24px, 1st, 2nd, 3rd, 4th, 4k, 3d, 16gb, 60hz, win11, covid19
  masked = masked.replace(/\b\d+([a-zA-Z]+|\.[a-zA-Z0-9]+)\b/g, (m) => " ".repeat(m.length));
  masked = masked.replace(/\b[a-zA-Z]+\d+[a-zA-Z0-9]*\b/g, (m) => " ".repeat(m.length));
  // Normalize smart quotes and dashes in-place so character indices stay identical
  masked = masked.replace(/[\u2018\u2019\u0060\u00B4]/g, "'");
  masked = masked.replace(/[\u2013\u2014]/g, " ");

  const regex = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

  const words: {
    word: string;
    clean: string;
    index: number;
  }[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(masked)) !== null) {
    const originalSlice = text.slice(match.index, match.index + match[0].length);
    words.push({
      word: originalSlice,
      clean: match[0],
      index: match.index,
    });
  }

  return words;
}

/* =========================================================
   LOCAL SPELL CHECK ENGINE
   ========================================================= */

function checkWithOurEngine(
  text: string,
  lowConfidenceWords = new Set<string>(),
  dialect = "en-US",
  isDigitalText = true
): SpellError[] {
  const words = getWords(text);
  const errors: SpellError[] = [];
  const correctionCache = new Map<string, string | null>();

  for (let i = 0; i < words.length; i++) {
    const item = words[i];
    const original = item.word;
    const cleanWord = item.clean;
    const clean = normalizeWord(cleanWord);

    if (!isReasonableWord(cleanWord, isDigitalText, original)) {
      continue;
    }

    if (!isDigitalText) {
      // In OCR mode, NEVER flag 2-letter tokens as errors (e.g. sy, ey, ot, nl, oc, yl)
      if (clean.length <= 2) {
        continue;
      }
      // In OCR mode, do not flag 3-letter tokens unless they are common typos (e.g. teh, adn)
      if (clean.length === 3 && !COMMON_TYPO_MAP[clean]) {
        continue;
      }
    }

    if (isLikelyNamedOrAcronym(original, dialect)) {
      continue;
    }

    // Already valid in selected dialect
    if (isValidEnglishWord(clean, dialect)) {
      continue;
    }

    // Check if word is TitleCase (capitalized)
    const isCapitalized = /^[A-Z][a-z]+$/.test(original);
    const atStart = isSentenceStart(text, item.index);

    // Title / heading context detection:
    // In titles ("Annual Finacial Reprot" or "High Quallity Servises"), neighboring words are also capitalized.
    const prevItem = i > 0 ? words[i - 1] : null;
    const nextItem = i < words.length - 1 ? words[i + 1] : null;
    const isTitleContext =
      Boolean(prevItem && /^[A-Z]/.test(prevItem.word)) ||
      Boolean(nextItem && /^[A-Z]/.test(nextItem.word));

    const isCommonTypo = Boolean(COMMON_TYPO_MAP[clean]);

    if (isCapitalized && !atStart && !isTitleContext && !isCommonTypo) {
      // Isolated capitalized word mid-sentence.
      // Only flag if correction exists and has distance <= 1 (e.g. "Quallity" -> "Quality", "Suport" -> "Support")
      const candidateCorr = getBestCorrection(original, cleanWord, dialect);
      if (!candidateCorr || damerauLevenshtein(clean, normalizeWord(candidateCorr)) > 1) {
        // Protect genuine proper names (e.g. personal names or places)
        continue;
      }
    }

    // Skip low-confidence OCR artifacts from graphics/icons
    if (lowConfidenceWords.has(clean)) {
      continue;
    }

    const cacheKey = `${original}:${cleanWord}:${dialect}`;
    let correction = correctionCache.get(cacheKey);

    if (correction === undefined) {
      correction = getBestCorrection(original, cleanWord, dialect);
      correctionCache.set(cacheKey, correction);
    }

    // In digital text, if a word is invalid English, never silently suppress it
    if (!correction && !isDigitalText) {
      continue;
    }

    if (correction && correction.toLowerCase() === original.toLowerCase()) {
      continue;
    }

    errors.push({
      word: original,
      suggestion: correction ?? null,
      index: item.index,
    });
  }

  return errors;
}

type PdfTextResult = {
  text: string;
  pageStarts: number[];
  hasTextLayer: boolean;
  ocrWords?: PdfOcrWord[];
  blocks?: OcrBlock;
};

type PdfOcrWord = {
  text: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

type SpellWorker = Awaited<ReturnType<typeof createWorker>>;

function getWorkerPath(): string {
  const candidates = [
    join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
    join(__dirname, "..", "..", "..", "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
    join(__dirname, "..", "..", "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
    join(__dirname, "..", "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return require.resolve("tesseract.js/src/worker-script/node/index.js");
  } catch {
    return candidates[0];
  }
}

async function getOcrWorker(): Promise<SpellWorker> {
  const tmpDir = tmpdir();
  const tmpTrainedData = join(tmpDir, "eng.traineddata");

  const candidates = [
    join(process.cwd(), "dictionaries", "eng.traineddata"),
    join(process.cwd(), "eng.traineddata"),
    join(__dirname, "..", "..", "..", "dictionaries", "eng.traineddata"),
    join(__dirname, "..", "..", "..", "eng.traineddata"),
    join(__dirname, "..", "..", "dictionaries", "eng.traineddata"),
    join(__dirname, "..", "dictionaries", "eng.traineddata"),
    join(__dirname, "eng.traineddata"),
  ];

  if (!existsSync(tmpTrainedData)) {
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          copyFileSync(candidate, tmpTrainedData);
          break;
        } catch (e) {
          console.warn("[Spellense] Could not copy traineddata to tmp from", candidate, e);
        }
      }
    }
  }

  const workerPath = getWorkerPath();

  return await createWorker("eng", 1, {
    workerPath,
    cachePath: tmpDir,
    langPath: tmpDir,
    gzip: false,
  });
}

async function extractPdfText(
  buffer: Buffer
): Promise<PdfTextResult> {
  const { getDocument } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  const pageStarts: number[] = [];
  let textLength = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");

    pageStarts.push(textLength);
    pages.push(pageText);
    textLength += pageText.length + 2;

    // Free memory for this page immediately
    page.cleanup();
  }

  await pdf.cleanup();
  await loadingTask.destroy();

  return {
    text: pages.join("\n\n"),
    pageStarts,
    hasTextLayer: pages.some(Boolean),
  };
}

async function extractPdfOcrText(
  buffer: Buffer,
  worker: SpellWorker
): Promise<PdfTextResult> {
  const { getDocument } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  const pageStarts: number[] = [];
  const ocrWords: PdfOcrWord[] = [];
  const allBlocks: NonNullable<OcrBlock> = [];
  let textLength = 0;

  // Cap scanned PDF OCR to 15 pages to stay safely within serverless timeout
  const maxOcrPages = Math.min(pdf.numPages, 15);

  for (let pageNumber = 1; pageNumber <= maxOcrPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const context = canvas.getContext("2d");

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const result = await worker.recognize(
      canvas.toBuffer("image/png"),
      {},
      { blocks: true }
    );
    const pageText = result.data.text.trim();

    const pageBlocks = (result.data.blocks || []) as NonNullable<OcrBlock>;
    allBlocks.push(...pageBlocks);

    const words = pageBlocks.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.flatMap((line) => line.words)
      )
    );

    for (const word of words) {
      if (!word.text.trim() || !word.bbox) continue;

      ocrWords.push({
        text: word.text,
        page: pageNumber,
        left: word.bbox.x0 / viewport.width,
        top: word.bbox.y0 / viewport.height,
        width: (word.bbox.x1 - word.bbox.x0) / viewport.width,
        height: (word.bbox.y1 - word.bbox.y0) / viewport.height,
      });
    }

    pageStarts.push(textLength);
    pages.push(pageText);
    textLength += pageText.length + 2;

    page.cleanup();
  }

  await pdf.cleanup();
  await loadingTask.destroy();

  return {
    text: pages.join("\n\n"),
    pageStarts,
    hasTextLayer: false,
    ocrWords,
    blocks: allBlocks,
  };
}

async function extractDocxText(
  buffer: Buffer
): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function collectPptxText(value: unknown, parts: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectPptxText(item, parts));
    return;
  }

  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;

  Object.entries(record).forEach(([key, child]) => {
    if (key === "a:t") {
      if (Array.isArray(child)) {
        child.forEach((text) => {
          if (typeof text === "string") parts.push(text);
        });
      }
      return;
    }

    if (key !== "_") collectPptxText(child, parts);
  });
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const parser = new PPTX2Json();
  const directory = await mkdtemp(join(tmpdir(), "spellense-pptx-"));
  const filePath = join(directory, "input.pptx");

  await writeFile(filePath, buffer);

  let presentation: Record<string, unknown>;
  try {
    presentation = await parser.toJson(filePath);
  } finally {
    await unlink(filePath).catch(() => undefined);
  }

  const slides = Object.entries(presentation)
    .filter(([key]) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const pageTexts = slides.map(([, slide]) => {
    const parts: string[] = [];
    collectPptxText(slide, parts);
    return parts.join(" ").trim();
  });

  return pageTexts.filter(Boolean).join("\n\n");
}

function extractXlsxText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });
  const sections = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const text = rows
      .map((row) => row.map((cell) => String(cell).trim()).filter(Boolean).join(" "))
      .filter(Boolean)
      .join("\n");

    return `${sheetName}\n${text}`.trim();
  });

  return sections.filter(Boolean).join("\n\n");
}

/* =========================================================
   FILTER OCR BLOCKS (Eliminate foreign script & photo noise)
   ========================================================= */

function filterOcrBlocks(
  rawBlocks: OcrBlock,
  dialect: string
): { filteredBlocks: NonNullable<OcrBlock>; cleanText: string } {
  if (!rawBlocks || rawBlocks.length === 0) {
    return { filteredBlocks: [], cleanText: "" };
  }

  const keptBlocks: NonNullable<OcrBlock> = [];
  const keptTextLines: string[] = [];

  for (const block of rawBlocks) {
    const keptParagraphs = [];

    for (const paragraph of block.paragraphs) {
      const keptLines = [];

      for (const line of paragraph.lines) {
        // 1. Filter out individual words with low confidence or impossible letter clusters
        const validWordsInLine = line.words.filter((w) => {
          const clean = normalizeWord(w.text);
          if (!clean) return false;
          // In OCR, words <= 3 chars must have high confidence (>= 80)
          const minConf = clean.length <= 3 ? 80 : 72;
          if (w.confidence < minConf) return false;
          // Check reasonable word heuristics
          return isReasonableWord(w.text, false, w.text);
        });

        if (validWordsInLine.length === 0) continue;

        // 2. Language density check: count recognizable English words
        const englishWords = validWordsInLine.filter((w) => {
          const clean = normalizeWord(w.text);
          return (
            isValidEnglishWord(clean, dialect) ||
            KNOWN_VALID_WORDS.has(clean) ||
            KNOWN_ACRONYMS.has(clean) ||
            Boolean(COMMON_TYPO_MAP[clean])
          );
        });

        // If line has multiple words, but ZERO recognizable English words:
        // It is almost certainly Arabic script, foreign text, or photo texture noise.
        if (validWordsInLine.length >= 2 && englishWords.length === 0) {
          continue;
        }

        // If line has a single word:
        if (validWordsInLine.length === 1) {
          const singleClean = normalizeWord(validWordsInLine[0].text);
          const isKnown =
            isValidEnglishWord(singleClean, dialect) ||
            KNOWN_VALID_WORDS.has(singleClean) ||
            KNOWN_ACRONYMS.has(singleClean) ||
            Boolean(COMMON_TYPO_MAP[singleClean]);

          if (!isKnown) {
            // Drop short single-word noise tokens like "Sy", "Ey", "yl", "nl", "oc", etc.
            if (singleClean.length < 4 || validWordsInLine[0].confidence < 82) {
              continue;
            }
          }
        }

        keptLines.push({ words: validWordsInLine });
        keptTextLines.push(validWordsInLine.map((w) => w.text).join(" "));
      }

      if (keptLines.length > 0) {
        keptParagraphs.push({ lines: keptLines });
      }
    }

    if (keptParagraphs.length > 0) {
      keptBlocks.push({ paragraphs: keptParagraphs });
    }
  }

  return {
    filteredBlocks: keptBlocks,
    cleanText: keptTextLines.join("\n"),
  };
}

/* =========================================================
   POST REQUEST
   ========================================================= */

export async function POST(
  request: Request
) {
  let worker: SpellWorker | null = null;

  try {
    /* -----------------------------------------------------
       GET FILE
    ----------------------------------------------------- */

    const formData =
      await request.formData();

    const preExtractedText = formData.get("text") as string | null;
    const preExtractedPageStartsRaw = formData.get("pageStarts") as string | null;
    const preExtractedFileName = formData.get("fileName") as string | null;
    const dialectParam = formData.get("dialect") as string | null;
    const dialect = dialectParam === "en-GB" ? "en-GB" : "en-US";

    let text = "";
    let blocks: OcrBlock = [];
    let pdfPageStarts: number[] = [];
    let pdfHasTextLayer = false;
    let pdfOcrWords: PdfOcrWord[] = [];
    let imageMarks: ImageMark[] = [];
    let fileName = "";
    let isPdf = false;
    let isImage = false;

    if (typeof preExtractedText === "string" && preExtractedText.trim()) {
      text = preExtractedText;
      fileName = (preExtractedFileName || "document.pdf").toLowerCase();
      isPdf = fileName.endsWith(".pdf");
      isImage = /\.(png|jpe?g|webp|avif|gif|bmp|tiff|heic)$/i.test(fileName);
      pdfHasTextLayer = isPdf;
      try {
        pdfPageStarts = preExtractedPageStartsRaw ? JSON.parse(preExtractedPageStartsRaw) : [];
      } catch {
        pdfPageStarts = [];
      }
    } else {
      const file =
        formData.get("file");

      if (
        !(file instanceof File)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No file was uploaded.",
          },
          {
            status: 400,
          }
        );
      }

      fileName =
        file.name.toLowerCase();

      /* -----------------------------------------------------
         FILE SIZE LIMIT (25 MB)
      ----------------------------------------------------- */

      const MAX_FILE_SIZE = 25 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File size exceeds the 25 MB limit. Please upload a smaller file.",
          },
          {
            status: 400,
          }
        );
      }

      /* -----------------------------------------------------
         FILE TYPE
      ----------------------------------------------------- */

      isImage =
        file.type.startsWith(
          "image/"
        ) ||
        /\.(png|jpe?g|webp|avif|gif|bmp|tiff|heic)$/i.test(fileName);

      isPdf =
        file.type ===
          "application/pdf" ||
        fileName.endsWith(".pdf");

      const isDocx =
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileName.endsWith(".docx");

      const isPptx =
        file.type ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        fileName.endsWith(".pptx");

      const isXlsx =
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        fileName.endsWith(".xlsx");

      if (!isImage && !isPdf && !isDocx && !isPptx && !isXlsx) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Please upload a DOCX, PPTX, XLSX, PDF or image file such as JPG, PNG or WEBP.",
          },
          {
            status: 400,
          }
        );
      }

      /* -----------------------------------------------------
         READ IMAGE INTO MEMORY
      ----------------------------------------------------- */

      const buffer =
        Buffer.from(
          await file.arrayBuffer()
        );

      /* -----------------------------------------------------
         TEXT EXTRACTION
      ----------------------------------------------------- */

      if (isDocx) {
        text = await extractDocxText(buffer);
      } else if (isPptx) {
        text = await extractPptxText(buffer);
      } else if (isXlsx) {
        text = extractXlsxText(buffer);
      } else if (isPdf) {
        let pdfText = await extractPdfText(buffer);

        if (!pdfText.text.trim()) {
          worker = await getOcrWorker();
          pdfText = await extractPdfOcrText(buffer, worker);
          blocks = pdfText.blocks ?? [];
        }

        text = pdfText.text;
        pdfPageStarts = pdfText.pageStarts;
        pdfHasTextLayer = pdfText.hasTextLayer;
        pdfOcrWords = pdfText.ocrWords ?? [];
      } else {
        worker = await getOcrWorker();

        const result = await worker.recognize(
          buffer,
          {},
          { blocks: true }
        );

        const rawBlocks = result.data.blocks as OcrBlock;
        const filtered = filterOcrBlocks(rawBlocks, dialect);

        text = filtered.cleanText;
        blocks = filtered.filteredBlocks;

        const image = await loadImage(buffer);
        const ocrWords = (filtered.filteredBlocks ?? []).flatMap((block) =>
          block.paragraphs.flatMap((paragraph) =>
            paragraph.lines.flatMap((line) => line.words)
          )
        );
        imageMarks = ocrWords
          .filter((word) => word.bbox)
          .map((word) => ({
            word: word.text,
            left: word.bbox!.x0 / image.width,
            top: word.bbox!.y0 / image.height,
            width: (word.bbox!.x1 - word.bbox!.x0) / image.width,
            height: (word.bbox!.y1 - word.bbox!.y0) / image.height,
          }));
      }
    }

    /* -----------------------------------------------------
       CLEAN OCR TEXT
    ----------------------------------------------------- */

    const cleanText =
      text
        .replace(/\r/g, "")
        .replace(
          /[ \t]+/g,
          " "
        )
        .replace(
          /\n{3,}/g,
          "\n\n"
        )
        .trim();

    /* -----------------------------------------------------
       NO TEXT
    ----------------------------------------------------- */

    if (!cleanText) {
      return NextResponse.json({
        success: true,
        filename:
          fileName,
        text: "",
        errors: [],
        wordCount: 0,
        errorCount: 0,
        message:
          "No readable English text was detected.",
      });
    }

    /* -----------------------------------------------------
       LOCAL SPELL ENGINE
    ----------------------------------------------------- */

    const isDigitalText = !isImage && (!isPdf || pdfHasTextLayer);

    let errors =
      checkWithOurEngine(
        cleanText,
        getLowConfidenceOcrWords(
          blocks
        ),
        dialect,
        isDigitalText
      );

    /* -----------------------------------------------------
       REMOVE DUPLICATES
    ----------------------------------------------------- */

    const unique =
      new Map<
        string,
        SpellError
      >();

    for (
      const error of errors
    ) {
      const key =
        `${error.index}:${error.word.toLowerCase()}`;

      if (
        !unique.has(key)
      ) {
        unique.set(
          key,
          error
        );
      }
    }

    errors =
      Array.from(
        unique.values()
      ).sort(
        (a, b) =>
          a.index - b.index
      );

    if (isPdf && pdfPageStarts.length > 0) {
      errors = errors.map((error) => {
        let page = 1;

        for (let index = 0; index < pdfPageStarts.length; index += 1) {
          if (pdfPageStarts[index] > error.index) break;
          page = index + 1;
        }

        return {
          ...error,
          page,
        };
      });
    }

    const pdfMarks =
      isPdf && !pdfHasTextLayer
        ? errors.flatMap((error) => {
            const match = pdfOcrWords.find(
              (word) =>
                word.page === error.page &&
                word.text.toLowerCase().replace(/[^a-z]/g, "") ===
                error.word.toLowerCase().replace(/[^a-z]/g, "")
            );

            return match ? [{ ...match, word: error.word }] : [];
          })
        : [];

    /* -----------------------------------------------------
       WORD COUNT
    ----------------------------------------------------- */

    const words =
      getWords(
        cleanText
      );

    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    return NextResponse.json({
      success: true,
      filename:
        fileName,
      text: cleanText,
      errors,
      wordCount:
        words.length,
      errorCount:
        errors.length,
      pdfHasTextLayer: isPdf ? pdfHasTextLayer : undefined,
      pdfMarks: isPdf ? pdfMarks : undefined,
      imageMarks: isImage
        ? imageMarks.filter((mark) => {
            const cleanMark = normalizeWord(mark.word);
            return errors.some(
              (err) => normalizeWord(err.word) === cleanMark
            );
          })
        : undefined,
      pageStarts: isPdf && pdfPageStarts.length > 0 ? pdfPageStarts : undefined,
    });
  } catch (error) {
    console.error(
      "Spellense check error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while checking the file.",
      },
      {
        status: 500,
      }
    );
  } finally {
    /* -----------------------------------------------------
       OCR WORKER CLEANUP
    ----------------------------------------------------- */

    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
}
