/**
 * Extended dictionary of globally recognized brands, appliance/hardware manufacturers,
 * global manufacturing hubs, cities, ports, and tech specifications.
 * All entries must be stored in lowercase.
 */

export const MODERN_VALID_WORDS = new Set<string>([
  // Chinese tech, manufacturing, appliance & logistics hubs
  "yangzhou", "huzhou", "xiamen", "shenzhen", "jiangmen", "guangzhou", "dongguan", "foshan", "ningbo", "wuxi",
  "suzhou", "changzhou", "shunde", "qingdao", "tianjin", "wuhan", "chengdu", "hangzhou", "fuzhou", "chongqing",
  "nanjing", "hefei", "kunshan", "zhuhai", "zhongshan", "yantai", "weihai", "dalian", "jinan", "shenyang",
  "harbin", "zhengzhou", "changsha", "xian", "nanning", "guilin", "sanya", "haikou", "kunming", "guiyang",
  "taizhou", "wenzhou", "jiaxing", "shaoxing", "jinhua", "yiwu", "cixi", "yuyao", "zhanjiang", "huizhou",
  "chaozhou", "shantou", "hainan", "guangdong", "zhejiang", "jiangsu", "shandong", "sichuan",

  // Global appliance & consumer electronics brands (Hisense Group & international leaders)
  "ronshen", "gorenje", "asko", "kelon", "hisense", "haier", "midea", "gree", "tcl", "electrolux",
  "whirlpool", "bosch", "siemens", "miele", "smeg", "delonghi", "dyson", "panasonic", "sharp", "toshiba",
  "hitachi", "beko", "grundig", "blomberg", "candy", "hoover", "indesit", "hotpoint", "ariston", "zanussi",
  "aeg", "liebherr", "vestel", "daikin", "mitsubishi", "carrier", "chigo", "aux", "galanz", "supor",
  "joyoung", "robam", "fotile", "vatti", "braun", "kenwood", "philips", "remington", "wahl", "nespresso",

  // Tech, mobile, electronics & PC hardware
  "asus", "acer", "lenovo", "xiaomi", "oppo", "vivo", "oneplus", "realme", "honor", "huawei",
  "meizu", "zte", "transsion", "infinix", "tecno", "itel", "nothing", "anker", "soundcore", "eufy",
  "ugreen", "baseus", "logitech", "razer", "corsair", "steelseries", "hyperx", "benq", "viewsonic", "aoc",
  "msi", "gigabyte", "asrock", "zotac", "palit", "gainward", "evga", "pny", "sapphire", "xfx",
  "powercolor", "inno3d", "galax", "kfa2", "seagate", "wd", "synology", "qnap", "tp-link", "d-link",
  "netgear", "ubiquiti", "mikrotik", "belkin", "bose", "sennheiser", "shure", "audio-technica", "rode",

  // Middle East & global cities
  "dubai", "sharjah", "ajman", "fujairah", "doha", "riyadh", "jeddah", "mecca", "medina", "dammam",
  "khobar", "muscat", "manama", "kuwait", "beirut", "amman", "cairo", "alexandria", "casablanca", "tunis",
  "algiers", "singapore", "bangkok", "jakarta", "manila", "hanoi", "tokyo", "seoul", "beijing", "shanghai",

  // Indian cities & Kerala districts
  "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad",
  "kochi", "trivandrum", "thiruvananthapuram", "calicut", "kozhikode", "kannur", "kollam", "thrissur",
  "palakkad", "malappuram", "alappuzha", "kottayam", "idukki", "wayanad", "kasaragod",
]);
