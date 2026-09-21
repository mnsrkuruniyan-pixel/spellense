// Dictionary and regex rules for US ↔ UK English Dialect Conversion

export interface ConversionMatch {
  original: string;
  converted: string;
  index: number;
}

export interface ConversionResult {
  text: string;
  changes: ConversionMatch[];
  changeCount: number;
}

// Core US to UK dictionary
export const US_TO_UK_MAP: Record<string, string> = {
  // -or to -our
  color: "colour",
  colors: "colours",
  colored: "coloured",
  coloring: "colouring",
  colorful: "colourful",
  colorfully: "colourfully",
  colorless: "colourless",
  honor: "honour",
  honors: "honours",
  honored: "honoured",
  honoring: "honouring",
  honorable: "honourable",
  honorably: "honourably",
  favor: "favour",
  favors: "favours",
  favored: "favoured",
  favoring: "favouring",
  favorable: "favourable",
  favorably: "favourably",
  favorite: "favourite",
  favorites: "favourites",
  armor: "armour",
  armors: "armours",
  armored: "armoured",
  behavior: "behaviour",
  behaviors: "behaviours",
  behavioral: "behavioural",
  neighbor: "neighbour",
  neighbors: "neighbours",
  neighboring: "neighbouring",
  neighborhood: "neighbourhood",
  neighborhoods: "neighbourhoods",
  rumor: "rumour",
  rumors: "rumours",
  rumored: "rumoured",
  labor: "labour",
  labors: "labours",
  labored: "laboured",
  laboring: "labouring",
  laborer: "labourer",
  laborers: "labourers",
  harbor: "harbour",
  harbors: "harbours",
  harbored: "harboured",
  harboring: "harbouring",
  odor: "odour",
  odors: "odours",
  odorless: "odourless",
  flavor: "flavour",
  flavors: "flavours",
  flavored: "flavoured",
  flavoring: "flavouring",
  flavorful: "flavourful",
  savior: "saviour",
  saviors: "saviours",
  vapor: "vapour",
  vapors: "vapours",
  clamor: "clamour",
  clamors: "clamours",
  clamored: "clamoured",
  fervor: "fervour",
  candor: "candour",
  rancor: "rancour",
  splendor: "splendour",
  parlor: "parlour",
  parlors: "parlours",
  humor: "humour",
  humors: "humours",
  humored: "humoured",
  tumor: "tumour",
  tumors: "tumours",
  demeanor: "demeanour",
  vigor: "vigour",
  valor: "valour",

  // -er to -re
  center: "centre",
  centers: "centres",
  centered: "centred",
  centering: "centring",
  theater: "theatre",
  theaters: "theatres",
  meter: "metre",
  meters: "metres",
  kilometer: "kilometre",
  kilometers: "kilometres",
  centimeter: "centimetre",
  centimeters: "centimetres",
  millimeter: "millimetre",
  millimeters: "millimetres",
  liter: "litre",
  liters: "litres",
  milliliter: "millilitre",
  milliliters: "millilitres",
  fiber: "fibre",
  fibers: "fibres",
  fiberglass: "fibreglass",
  caliber: "calibre",
  luster: "lustre",
  somber: "sombre",
  meager: "meagre",
  saber: "sabre",
  sabers: "sabres",
  sepulcher: "sepulchre",
  ocher: "ochre",

  // -ense to -ence
  defense: "defence",
  defenses: "defences",
  defenseless: "defenceless",
  offense: "offence",
  offenses: "offences",
  pretense: "pretence",
  pretenses: "pretences",

  // -og to -ogue
  catalog: "catalogue",
  catalogs: "catalogues",
  cataloged: "catalogued",
  cataloging: "cataloguing",
  dialog: "dialogue",
  dialogs: "dialogues",
  analog: "analogue",
  analogs: "analogues",
  prolog: "prologue",
  prologs: "prologues",

  // -ize / -yze to -ise / -yse
  organize: "organise",
  organizes: "organises",
  organized: "organised",
  organizing: "organising",
  organization: "organisation",
  organizations: "organisations",
  organizer: "organiser",
  organizers: "organisers",
  realize: "realise",
  realizes: "realises",
  realized: "realised",
  realizing: "realising",
  realization: "realisation",
  realizations: "realisations",
  analyze: "analyse",
  analyzes: "analyses",
  analyzed: "analysed",
  analyzing: "analysing",
  analyzer: "analyser",
  analyzers: "analysers",
  paralyze: "paralyse",
  paralyzes: "paralyses",
  paralyzed: "paralysed",
  paralyzing: "paralysing",
  apologize: "apologise",
  apologizes: "apologises",
  apologized: "apologised",
  apologizing: "apologising",
  criticize: "criticise",
  criticizes: "criticises",
  criticized: "criticised",
  criticizing: "criticising",
  emphasize: "emphasise",
  emphasizes: "emphasises",
  emphasized: "emphasised",
  emphasizing: "emphasising",
  maximize: "maximise",
  maximizes: "maximises",
  maximized: "maximised",
  maximizing: "maximising",
  minimize: "minimise",
  minimizes: "minimises",
  minimized: "minimised",
  minimizing: "minimising",
  optimize: "optimise",
  optimizes: "optimises",
  optimized: "optimised",
  optimizing: "optimising",
  optimization: "optimisation",
  optimizations: "optimisations",
  prioritize: "prioritise",
  prioritizes: "prioritises",
  prioritized: "prioritised",
  prioritizing: "prioritising",
  prioritization: "prioritisation",
  summarize: "summarise",
  summarizes: "summarises",
  summarized: "summarised",
  summarizing: "summarising",
  visualize: "visualise",
  visualizes: "visualises",
  visualized: "visualised",
  visualizing: "visualising",
  visualization: "visualisation",
  visualizations: "visualisations",
  utilize: "utilise",
  utilizes: "utilises",
  utilized: "utilised",
  utilizing: "utilising",
  utilization: "utilisation",
  specialize: "specialise",
  specializes: "specialises",
  specialized: "specialised",
  specializing: "specialising",
  specialization: "specialisation",
  finalize: "finalise",
  finalizes: "finalises",
  finalized: "finalised",
  finalizing: "finalising",
  customize: "customise",
  customizes: "customises",
  customized: "customised",
  customizing: "customising",
  customization: "customisation",
  customizations: "customisations",
  memorize: "memorise",
  memorizes: "memorises",
  memorized: "memorised",
  memorizing: "memorising",
  recognize: "recognise",
  recognizes: "recognises",
  recognized: "recognised",
  recognizing: "recognising",
  standardize: "standardise",
  standardizes: "standardises",
  standardized: "standardised",
  standardizing: "standardising",
  standardization: "standardisation",
  revolutionize: "revolutionise",
  revolutionizes: "revolutionises",
  revolutionized: "revolutionised",
  revolutionizing: "revolutionising",
  capitalize: "capitalise",
  capitalizes: "capitalises",
  capitalized: "capitalised",
  capitalizing: "capitalising",
  capitalization: "capitalisation",
  commercialize: "commercialise",
  commercializes: "commercialises",
  commercialized: "commercialised",
  commercializing: "commercialising",
  authorize: "authorise",
  authorizes: "authorises",
  authorized: "authorised",
  authorizing: "authorising",
  authorization: "authorisation",
  categorize: "categorise",
  categorizes: "categorises",
  categorized: "categorised",
  categorizing: "categorising",
  centralize: "centralise",
  centralizes: "centralises",
  centralized: "centralised",
  centralizing: "centralising",
  centralization: "centralisation",
  decentralize: "decentralise",
  decentralizes: "decentralises",
  decentralized: "decentralised",
  decentralizing: "decentralising",
  harmonize: "harmonise",
  harmonizes: "harmonises",
  harmonized: "harmonised",
  harmonizing: "harmonising",
  modernize: "modernise",
  modernizes: "modernises",
  modernized: "modernised",
  modernizing: "modernising",
  modernization: "modernisation",
  penalize: "penalise",
  penalizes: "penalises",
  penalized: "penalised",
  penalizing: "penalising",
  privatize: "privatise",
  privatizes: "privatises",
  privatized: "privatised",
  privatizing: "privatising",
  privatization: "privatisation",
  socialize: "socialise",
  socializes: "socialises",
  socialized: "socialised",
  socializing: "socialising",
  sympathize: "sympathise",
  sympathizes: "sympathises",
  sympathized: "sympathised",
  sympathizing: "sympathising",
  fantasize: "fantasise",
  fantasizes: "fantasises",
  fantasized: "fantasised",
  fantasizing: "fantasising",

  // Double 'l' forms
  traveled: "travelled",
  traveling: "travelling",
  traveler: "traveller",
  travelers: "travellers",
  canceled: "cancelled",
  canceling: "cancelling",
  fueled: "fuelled",
  fueling: "fuelling",
  dialed: "dialled",
  dialing: "dialling",
  signaled: "signalled",
  signaling: "signalling",
  modeled: "modelled",
  modeling: "modelling",
  labeled: "labelled",
  labeling: "labelling",
  leveled: "levelled",
  leveling: "levelling",
  quarreled: "quarrelled",
  quarreling: "quarrelling",
  jewelry: "jewellery",
  counselor: "counsellor",
  counselors: "counsellors",
  counseling: "counselling",
  woolen: "woollen",
  fulfill: "fulfil",
  fulfillment: "fulfilment",
  enroll: "enrol",
  enrollment: "enrolment",
  enrolls: "enrols",
  installment: "instalment",
  installments: "instalments",
  skillful: "skilful",
  skillfully: "skilfully",
  willful: "wilful",
  willfully: "wilfully",
  appall: "appal",

  // Vocabulary & Nuances
  apartment: "flat",
  apartments: "flats",
  elevator: "lift",
  elevators: "lifts",
  truck: "lorry",
  trucks: "lorries",
  subway: "underground",
  diaper: "nappy",
  diapers: "nappies",
  flashlight: "torch",
  flashlights: "torches",
  fries: "chips",
  "french fries": "chips",
  cookie: "biscuit",
  cookies: "biscuits",
  vacation: "holiday",
  vacations: "holidays",
  sidewalk: "pavement",
  sidewalks: "pavements",
  soccer: "football",
  windshield: "windscreen",
  blinker: "indicator",
  blinkers: "indicators",
  gasoline: "petrol",
  freeway: "motorway",
  freeways: "motorways",
  garbage: "rubbish",
  trash: "rubbish",
  "garbage can": "rubbish bin",
  "trash can": "rubbish bin",
  eraser: "rubber",
  erasers: "rubbers",
  faucet: "tap",
  faucets: "taps",
  "band-aid": "plaster",
  "band-aids": "plasters",
  "shopping cart": "shopping trolley",
  stroller: "pushchair",
  pacifier: "dummy",
  gray: "grey",
  grayish: "greyish",
  cozy: "cosy",
  coziness: "cosiness",
  cozier: "cosier",
  coziest: "cosiest",
  curb: "kerb",
  curbs: "kerbs",
  tire: "tyre",
  tires: "tyres",
  aluminum: "aluminium",
  pajamas: "pyjamas",
  mustache: "moustache",
  skeptical: "sceptical",
  skepticism: "scepticism",
  skeptic: "sceptic",
  skeptics: "sceptics",
  sulfur: "sulphur",
  draft: "draught",
  drafts: "draughts",
  mold: "mould",
  molds: "moulds",
  moldy: "mouldy",
  specialty: "speciality",
  specialties: "specialities",
  aging: "ageing",
  maneuver: "manoeuvre",
  maneuvers: "manoeuvres",
  maneuvered: "manoeuvred",
  maneuvering: "manoeuvring",
  pediatric: "paediatric",
  pediatrician: "paediatrician",
  pediatrics: "paediatrics",
  encyclopedia: "encyclopaedia",
  encyclopedias: "encyclopaedias",
  archeology: "archaeology",
  anemia: "anaemia",
  anemic: "anaemic",
  anesthesia: "anaesthesia",
  anesthetic: "anaesthetic",
  fetus: "foetus",
  estrogen: "oestrogen",
  program: "programme",
  programs: "programmes",
};

// Generate UK to US inverse dictionary
export const UK_TO_US_MAP: Record<string, string> = {};
for (const [us, uk] of Object.entries(US_TO_UK_MAP)) {
  // Avoid overwriting specific nuances if already mapped
  if (!UK_TO_US_MAP[uk]) {
    UK_TO_US_MAP[uk] = us;
  }
}
// Add UK-specific manual reverse mappings
UK_TO_US_MAP["cheque"] = "check";
UK_TO_US_MAP["cheques"] = "checks";
UK_TO_US_MAP["crisps"] = "chips";
UK_TO_US_MAP["lorry"] = "truck";
UK_TO_US_MAP["lorries"] = "trucks";
UK_TO_US_MAP["flat"] = "apartment";
UK_TO_US_MAP["flats"] = "apartments";
UK_TO_US_MAP["lift"] = "elevator";
UK_TO_US_MAP["lifts"] = "elevators";
UK_TO_US_MAP["nappy"] = "diaper";
UK_TO_US_MAP["nappies"] = "diapers";
UK_TO_US_MAP["torch"] = "flashlight";
UK_TO_US_MAP["torches"] = "flashlights";
UK_TO_US_MAP["pavement"] = "sidewalk";
UK_TO_US_MAP["pavements"] = "sidewalks";
UK_TO_US_MAP["rubbish"] = "trash";
UK_TO_US_MAP["biscuit"] = "cookie";
UK_TO_US_MAP["biscuits"] = "cookies";
UK_TO_US_MAP["petrol"] = "gasoline";
UK_TO_US_MAP["motorway"] = "highway";
UK_TO_US_MAP["motorways"] = "highways";
UK_TO_US_MAP["bonnet"] = "hood";
UK_TO_US_MAP["boot"] = "trunk";
UK_TO_US_MAP["windscreen"] = "windshield";
UK_TO_US_MAP["pushchair"] = "stroller";
UK_TO_US_MAP["dummy"] = "pacifier";

/**
 * Match casing of source word to replacement word
 */
function applyCasing(source: string, target: string): string {
  if (!source || !target) return target;
  // All Caps: COLOR -> COLOUR
  if (source === source.toUpperCase() && source.length > 1) {
    return target.toUpperCase();
  }
  // Title Case: Color -> Colour
  if (source[0] === source[0].toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  }
  // Lowercase: color -> colour
  return target.toLowerCase();
}

/**
 * Convert text between US and UK English
 */
export function convertDialect(
  input: string,
  direction: "us-to-uk" | "uk-to-us"
): ConversionResult {
  if (!input) {
    return { text: "", changes: [], changeCount: 0 };
  }

  const map = direction === "us-to-uk" ? US_TO_UK_MAP : UK_TO_US_MAP;
  const changes: ConversionMatch[] = [];

  // Sort dictionary keys by descending length so multi-word phrases (e.g. "french fries", "garbage can") match first
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);

  // Build master regex pattern with word boundaries
  // Escape special regex characters in keys
  const escapedKeys = keys.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escapedKeys.join("|")})\\b`, "gi");

  const transformedText = input.replace(pattern, (match, _, offset) => {
    const lower = match.toLowerCase();
    const replacement = map[lower];
    if (replacement) {
      const cased = applyCasing(match, replacement);
      changes.push({
        original: match,
        converted: cased,
        index: offset,
      });
      return cased;
    }
    return match;
  });

  return {
    text: transformedText,
    changes,
    changeCount: changes.length,
  };
}

