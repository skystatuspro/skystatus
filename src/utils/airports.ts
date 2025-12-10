// /utils/airports.ts
import { CabinClass } from '../types';

// 1. Types

export interface AirportInfo {
  lat: number;
  lon: number;
  name: string;
  country: string; // ISO country code, used for Domestic detection
}

export type DistanceBand = 'Domestic' | 'Medium' | 'Long 1' | 'Long 2' | 'Long 3';

export type FlightType = 'Domestic' | 'International';

// 2. Database: hubs, feeders en XP run bestemmingen

export const AIRPORTS: Record<string, AirportInfo> = {
  // --- AF-KLM Hubs ---
  AMS: { lat: 52.3086, lon: 4.7639, name: 'Amsterdam Schiphol', country: 'NL' },
  CDG: { lat: 49.0097, lon: 2.5479, name: 'Paris Charles de Gaulle', country: 'FR' },

  // --- Benelux (overig) ---
  BRU: { lat: 50.9014, lon: 4.4844, name: 'Brussels', country: 'BE' },
  LUX: { lat: 49.6233, lon: 6.2044, name: 'Luxembourg', country: 'LU' },
  RTM: { lat: 51.9569, lon: 4.4372, name: 'Rotterdam The Hague', country: 'NL' },

  // --- Frankrijk (Parijs & Regionaal) ---
  ORY: { lat: 48.7233, lon: 2.3794, name: 'Paris Orly', country: 'FR' },
  NCE: { lat: 43.6653, lon: 7.2150, name: 'Nice Côte d\'Azur', country: 'FR' },
  LYS: { lat: 45.7256, lon: 5.0811, name: 'Lyon-Saint Exupéry', country: 'FR' },
  MRS: { lat: 43.4367, lon: 5.2150, name: 'Marseille Provence', country: 'FR' },
  TLS: { lat: 43.6291, lon: 1.3638, name: 'Toulouse-Blagnac', country: 'FR' },
  BOD: { lat: 44.8283, lon: -0.7156, name: 'Bordeaux-Mérignac', country: 'FR' },
  NTE: { lat: 47.1532, lon: -1.6107, name: 'Nantes Atlantique', country: 'FR' },
  SXB: { lat: 48.5383, lon: 7.6282, name: 'Strasbourg', country: 'FR' },
  MPL: { lat: 43.5761, lon: 3.9631, name: 'Montpellier', country: 'FR' },
  BES: { lat: 48.4479, lon: -4.4214, name: 'Brest Bretagne', country: 'FR' },
  BIQ: { lat: 43.4684, lon: -1.5233, name: 'Biarritz', country: 'FR' },
  AJA: { lat: 41.9237, lon: 8.7932, name: 'Ajaccio Napoleon Bonaparte', country: 'FR' },
  BIA: { lat: 42.5527, lon: 9.4837, name: 'Bastia Poretta', country: 'FR' },

  // --- UK / Ierland ---
  LHR: { lat: 51.4706, lon: -0.4619, name: 'London Heathrow', country: 'GB' },
  LGW: { lat: 51.1481, lon: -0.1903, name: 'London Gatwick', country: 'GB' },
  LCY: { lat: 51.5050, lon: 0.0544, name: 'London City', country: 'GB' },
  MAN: { lat: 53.3629, lon: -2.2733, name: 'Manchester', country: 'GB' },
  BHX: { lat: 52.4539, lon: -1.7481, name: 'Birmingham', country: 'GB' },
  EDI: { lat: 55.9500, lon: -3.3725, name: 'Edinburgh', country: 'GB' },
  GLA: { lat: 55.8719, lon: -4.4331, name: 'Glasgow', country: 'GB' },
  ABZ: { lat: 57.2019, lon: -2.2043, name: 'Aberdeen', country: 'GB' },
  NCL: { lat: 55.0375, lon: -1.6917, name: 'Newcastle', country: 'GB' },
  BRS: { lat: 51.3827, lon: -2.7191, name: 'Bristol', country: 'GB' },
  SOU: { lat: 50.9503, lon: -1.3568, name: 'Southampton', country: 'GB' },
  NWI: { lat: 52.6758, lon: 1.2828, name: 'Norwich', country: 'GB' },
  HUY: { lat: 53.5744, lon: -0.3508, name: 'Humberside', country: 'GB' },
  MME: { lat: 54.5092, lon: -1.4322, name: 'Teesside', country: 'GB' },
  INV: { lat: 57.5425, lon: -4.0475, name: 'Inverness', country: 'GB' },
  CWL: { lat: 51.3967, lon: -3.3433, name: 'Cardiff', country: 'GB' },
  DUB: { lat: 53.4213, lon: -6.2701, name: 'Dublin', country: 'IE' },
  ORK: { lat: 51.8413, lon: -8.4911, name: 'Cork', country: 'IE' },
  BHD: { lat: 54.6189, lon: -5.8725, name: 'George Best Belfast City', country: 'GB' },

  // --- Duitsland ---
  FRA: { lat: 50.0333, lon: 8.5706, name: 'Frankfurt', country: 'DE' },
  MUC: { lat: 48.3538, lon: 11.7861, name: 'Munich', country: 'DE' },
  BER: { lat: 52.3622, lon: 13.5007, name: 'Berlin Brandenburg', country: 'DE' },
  HAM: { lat: 53.6304, lon: 9.9882, name: 'Hamburg', country: 'DE' },
  DUS: { lat: 51.2895, lon: 6.7668, name: 'Dusseldorf', country: 'DE' },
  STR: { lat: 48.6899, lon: 9.2220, name: 'Stuttgart', country: 'DE' },
  HAJ: { lat: 52.4602, lon: 9.6835, name: 'Hanover', country: 'DE' },
  NUE: { lat: 49.4987, lon: 11.0780, name: 'Nuremberg', country: 'DE' },
  BRE: { lat: 53.0475, lon: 8.7867, name: 'Bremen', country: 'DE' },

  // --- Spanje / Portugal ---
  MAD: { lat: 40.4719, lon: -3.5626, name: 'Adolfo Suárez Madrid–Barajas', country: 'ES' },
  BCN: { lat: 41.2971, lon: 2.0785, name: 'Barcelona–El Prat', country: 'ES' },
  AGP: { lat: 36.6749, lon: -4.4991, name: 'Málaga', country: 'ES' },
  VLC: { lat: 39.4893, lon: -0.4816, name: 'Valencia', country: 'ES' },
  BIO: { lat: 43.3011, lon: -2.9106, name: 'Bilbao', country: 'ES' },
  ALC: { lat: 38.2822, lon: -0.5582, name: 'Alicante', country: 'ES' },
  PMI: { lat: 39.5517, lon: 2.7388, name: 'Palma de Mallorca', country: 'ES' },
  SVQ: { lat: 37.4180, lon: -5.8931, name: 'Seville', country: 'ES' },
  IBZ: { lat: 38.8729, lon: 1.3731, name: 'Ibiza', country: 'ES' },
  LIS: { lat: 38.7742, lon: -9.1342, name: 'Lisbon', country: 'PT' },
  OPO: { lat: 41.2481, lon: -8.6814, name: 'Porto', country: 'PT' },

  // --- Italië ---
  FCO: { lat: 41.8003, lon: 12.2389, name: 'Rome Fiumicino', country: 'IT' },
  MXP: { lat: 45.6306, lon: 8.7281, name: 'Milan Malpensa', country: 'IT' },
  LIN: { lat: 45.4451, lon: 9.2767, name: 'Milan Linate', country: 'IT' },
  VCE: { lat: 45.5053, lon: 12.3519, name: 'Venice Marco Polo', country: 'IT' },
  BLQ: { lat: 44.5350, lon: 11.2887, name: 'Bologna', country: 'IT' },
  NAP: { lat: 40.8844, lon: 14.2908, name: 'Naples', country: 'IT' },
  FLR: { lat: 43.8100, lon: 11.2051, name: 'Florence', country: 'IT' },
  TRN: { lat: 45.2008, lon: 7.6496, name: 'Turin', country: 'IT' },
  GOA: { lat: 44.4133, lon: 8.8550, name: 'Genoa', country: 'IT' },
  VRN: { lat: 45.3957, lon: 10.8885, name: 'Verona', country: 'IT' },
  CTA: { lat: 37.4667, lon: 15.0664, name: 'Catania', country: 'IT' },
  PMO: { lat: 38.1760, lon: 13.0910, name: 'Palermo', country: 'IT' },
  OLB: { lat: 40.8987, lon: 9.5176, name: 'Olbia', country: 'IT' },
  BRI: { lat: 41.1389, lon: 16.7606, name: 'Bari', country: 'IT' },

  // --- Zwitserland / Oostenrijk ---
  ZRH: { lat: 47.4647, lon: 8.5492, name: 'Zurich', country: 'CH' },
  GVA: { lat: 46.2381, lon: 6.1089, name: 'Geneva', country: 'CH' },
  BSL: { lat: 47.5900, lon: 7.5292, name: 'EuroAirport Basel', country: 'CH' },
  VIE: { lat: 48.1103, lon: 16.5697, name: 'Vienna', country: 'AT' },
  GRZ: { lat: 46.9911, lon: 15.4396, name: 'Graz', country: 'AT' },

  // --- Noord-Europa (Scandinavië & Baltics) ---
  CPH: { lat: 55.6179, lon: 12.6560, name: 'Copenhagen', country: 'DK' },
  BLL: { lat: 55.7403, lon: 9.1518, name: 'Billund', country: 'DK' },
  AAL: { lat: 57.0928, lon: 9.8492, name: 'Aalborg', country: 'DK' },
  OSL: { lat: 60.1976, lon: 11.1004, name: 'Oslo', country: 'NO' },
  BGO: { lat: 60.2934, lon: 5.2181, name: 'Bergen', country: 'NO' },
  SVG: { lat: 58.8767, lon: 5.6378, name: 'Stavanger', country: 'NO' },
  TRD: { lat: 63.4578, lon: 10.9242, name: 'Trondheim', country: 'NO' },
  ARN: { lat: 59.6519, lon: 17.9186, name: 'Stockholm Arlanda', country: 'SE' },
  GOT: { lat: 57.6628, lon: 12.2798, name: 'Gothenburg Landvetter', country: 'SE' },
  LPI: { lat: 58.4132, lon: 15.5256, name: 'Linköping', country: 'SE' },
  HEL: { lat: 60.3172, lon: 24.9633, name: 'Helsinki-Vantaa', country: 'FI' },
  KEF: { lat: 63.9850, lon: -22.6056, name: 'Reykjavik Keflavik', country: 'IS' },
  TLL: { lat: 59.4133, lon: 24.8328, name: 'Tallinn', country: 'EE' },
  RIX: { lat: 56.9236, lon: 23.9711, name: 'Riga', country: 'LV' },
  VNO: { lat: 54.6341, lon: 25.2858, name: 'Vilnius', country: 'LT' },

  // --- Oost- & Centraal-Europa ---
  WAW: { lat: 52.1657, lon: 20.9671, name: 'Warsaw Chopin', country: 'PL' },
  KRK: { lat: 50.0777, lon: 19.7848, name: 'Kraków', country: 'PL' },
  GDN: { lat: 54.3776, lon: 18.4662, name: 'Gdańsk', country: 'PL' },
  WRO: { lat: 51.1027, lon: 16.8858, name: 'Wrocław', country: 'PL' },
  PRG: { lat: 50.1008, lon: 14.2600, name: 'Prague', country: 'CZ' },
  BUD: { lat: 47.4369, lon: 19.2556, name: 'Budapest', country: 'HU' },
  BUH: { lat: 44.5722, lon: 26.1022, name: 'Bucharest (OTP)', country: 'RO' },
  BEG: { lat: 44.8184, lon: 20.3091, name: 'Belgrade', country: 'RS' },
  ZAG: { lat: 45.7429, lon: 16.0688, name: 'Zagreb', country: 'HR' },
  SPU: { lat: 43.5389, lon: 16.2980, name: 'Split', country: 'HR' },
  DBV: { lat: 42.5614, lon: 18.2682, name: 'Dubrovnik', country: 'HR' },
  LJU: { lat: 46.2237, lon: 14.4576, name: 'Ljubljana', country: 'SI' },
  SOF: { lat: 42.6967, lon: 23.4114, name: 'Sofia', country: 'BG' },

  // --- Griekenland / Turkije / Rusland ---
  ATH: { lat: 37.9364, lon: 23.9445, name: 'Athens', country: 'GR' },
  IST: { lat: 41.2753, lon: 28.7520, name: 'Istanbul', country: 'TR' },
  SAW: { lat: 40.8986, lon: 29.3092, name: 'Istanbul Sabiha Gökçen', country: 'TR' },
  // SVO & DME uitgeschakeld of minder relevant wegens sancties, maar behouden voor historie/code-compleetheid
  SVO: { lat: 55.9726, lon: 37.4146, name: 'Sheremetyevo', country: 'RU' },
  DME: { lat: 55.4088, lon: 37.9063, name: 'Domodedovo', country: 'RU' },

  // --- Noord-Amerika: East Coast ---
  JFK: { lat: 40.6398, lon: -73.7789, name: 'New York JFK', country: 'US' },
  EWR: { lat: 40.6925, lon: -74.1687, name: 'Newark Liberty', country: 'US' },
  LGA: { lat: 40.7772, lon: -73.8726, name: 'LaGuardia', country: 'US' },
  BOS: { lat: 42.3643, lon: -71.0052, name: 'Boston Logan', country: 'US' },
  PHL: { lat: 39.8719, lon: -75.2411, name: 'Philadelphia', country: 'US' },
  IAD: { lat: 38.9445, lon: -77.4558, name: 'Washington Dulles', country: 'US' },
  DCA: { lat: 38.8521, lon: -77.0377, name: 'Reagan National', country: 'US' },
  BWI: { lat: 39.1754, lon: -76.6683, name: 'Baltimore/Washington', country: 'US' },

  // --- Noord-Amerika: Hubs/Binnenland ---
  ATL: { lat: 33.6367, lon: -84.4281, name: 'Hartsfield–Jackson Atlanta', country: 'US' },
  CLT: { lat: 35.2140, lon: -80.9431, name: 'Charlotte Douglas', country: 'US' },
  MCO: { lat: 28.4294, lon: -81.3090, name: 'Orlando', country: 'US' },
  TPA: { lat: 27.9755, lon: -82.5332, name: 'Tampa', country: 'US' },
  FLL: { lat: 26.0726, lon: -80.1527, name: 'Fort Lauderdale', country: 'US' },
  MIA: { lat: 25.7932, lon: -80.2906, name: 'Miami', country: 'US' },
  ORD: { lat: 41.9786, lon: -87.9048, name: 'Chicago O\'Hare', country: 'US' },
  DFW: { lat: 32.8968, lon: -97.0380, name: 'Dallas/Fort Worth', country: 'US' },
  DEN: { lat: 39.8617, lon: -104.6731, name: 'Denver', country: 'US' },
  SLC: { lat: 40.7884, lon: -111.9778, name: 'Salt Lake City', country: 'US' },
  MSP: { lat: 44.8820, lon: -93.2218, name: 'Minneapolis–Saint Paul', country: 'US' },
  DTW: { lat: 42.2124, lon: -83.3534, name: 'Detroit Metro', country: 'US' },
  IAH: { lat: 29.9844, lon: -95.3414, name: 'Houston Intercontinental', country: 'US' },
  PHX: { lat: 33.4343, lon: -112.0116, name: 'Phoenix Sky Harbor', country: 'US' },
  LAS: { lat: 36.0801, lon: -115.1522, name: 'Las Vegas', country: 'US' },

  // --- Noord-Amerika: West Coast / Pacific ---
  LAX: { lat: 33.9425, lon: -118.4081, name: 'Los Angeles', country: 'US' },
  SFO: { lat: 37.6188, lon: -122.3754, name: 'San Francisco', country: 'US' },
  SAN: { lat: 32.7336, lon: -117.1897, name: 'San Diego', country: 'US' },
  SEA: { lat: 47.4490, lon: -122.3093, name: 'Seattle–Tacoma', country: 'US' },
  HNL: { lat: 21.3187, lon: -157.9225, name: 'Honolulu', country: 'US' },

  // --- Canada ---
  YVR: { lat: 49.1939, lon: -123.1844, name: 'Vancouver', country: 'CA' },
  YYZ: { lat: 43.6772, lon: -79.6306, name: 'Toronto Pearson', country: 'CA' },
  YUL: { lat: 45.4706, lon: -73.7408, name: 'Montréal–Trudeau', country: 'CA' },
  YYC: { lat: 51.1139, lon: -114.0203, name: 'Calgary', country: 'CA' },

  // --- Midden-Oosten ---
  DXB: { lat: 25.2528, lon: 55.3644, name: 'Dubai International', country: 'AE' },
  AUH: { lat: 24.4330, lon: 54.6511, name: 'Abu Dhabi', country: 'AE' },
  DOH: { lat: 25.2731, lon: 51.6081, name: 'Hamad (Doha)', country: 'QA' },
  TLV: { lat: 32.0094, lon: 34.8828, name: 'Tel Aviv Ben Gurion', country: 'IL' },

  // --- Azië: Japan / Korea / China / HK / TW ---
  HND: { lat: 35.5523, lon: 139.7797, name: 'Tokyo Haneda', country: 'JP' },
  NRT: { lat: 35.7647, lon: 140.3863, name: 'Tokyo Narita', country: 'JP' },
  KIX: { lat: 34.4273, lon: 135.2440, name: 'Osaka Kansai', country: 'JP' },
  ICN: { lat: 37.4692, lon: 126.4505, name: 'Seoul Incheon', country: 'KR' },
  PEK: { lat: 40.0801, lon: 116.5846, name: 'Beijing Capital', country: 'CN' },
  PKX: { lat: 39.5098, lon: 116.4105, name: 'Beijing Daxing', country: 'CN' },
  PVG: { lat: 31.1434, lon: 121.8053, name: 'Shanghai Pudong', country: 'CN' },
  CAN: { lat: 23.3924, lon: 113.2988, name: 'Guangzhou Baiyun', country: 'CN' },
  HKG: { lat: 22.3089, lon: 113.9146, name: 'Hong Kong', country: 'HK' },
  TPE: { lat: 25.0777, lon: 121.2328, name: 'Taipei Taoyuan', country: 'TW' },

  // --- Azië: Zuidoost ---
  SIN: { lat: 1.3502, lon: 103.9944, name: 'Singapore Changi', country: 'SG' },
  BKK: { lat: 13.6811, lon: 100.7473, name: 'Bangkok Suvarnabhumi', country: 'TH' },
  KUL: { lat: 2.7433, lon: 101.6981, name: 'Kuala Lumpur', country: 'MY' },
  CGK: { lat: -6.1256, lon: 106.6559, name: 'Jakarta Soekarno–Hatta', country: 'ID' },
  MNL: { lat: 14.5086, lon: 121.0194, name: 'Manila', country: 'PH' },
  SGN: { lat: 10.8188, lon: 106.6519, name: 'Ho Chi Minh City', country: 'VN' },

  // --- Azië: India ---
  DEL: { lat: 28.5665, lon: 77.1031, name: 'Delhi Indira Gandhi', country: 'IN' },
  BOM: { lat: 19.0887, lon: 72.8679, name: 'Mumbai Chhatrapati Shivaji', country: 'IN' },
  BLR: { lat: 13.1979, lon: 77.7063, name: 'Bengaluru', country: 'IN' },

  // --- Latijns-Amerika / Cariben ---
  MEX: { lat: 19.4363, lon: -99.0721, name: 'Mexico City', country: 'MX' },
  CUN: { lat: 21.0365, lon: -86.8771, name: 'Cancún', country: 'MX' },
  GRU: { lat: -23.4356, lon: -46.4731, name: 'São Paulo/Guarulhos', country: 'BR' },
  CGH: { lat: -23.6266, lon: -46.6554, name: 'São Paulo/Congonhas', country: 'BR' },
  GIG: { lat: -22.8090, lon: -43.2506, name: 'Rio de Janeiro/Galeão', country: 'BR' },
  BOG: { lat: 4.7016, lon: -74.1469, name: 'El Dorado (Bogotá)', country: 'CO' },
  PTY: { lat: 9.0714, lon: -79.3835, name: 'Tocumen (Panama)', country: 'PA' },
  LIM: { lat: -12.0219, lon: -77.1143, name: 'Jorge Chávez (Lima)', country: 'PE' },
  SCL: { lat: -33.3930, lon: -70.7858, name: 'Santiago (Chile)', country: 'CL' },
  EZE: { lat: -34.8222, lon: -58.5358, name: 'Buenos Aires Ezeiza', country: 'AR' },

  // --- Cariben (NL/FR) ---
  CUR: { lat: 12.1889, lon: -68.9598, name: 'Curaçao', country: 'CW' },
  SXM: { lat: 18.0448, lon: -63.1141, name: 'Sint Maarten (Princess Juliana)', country: 'SX' },
  AUA: { lat: 12.5014, lon: -70.0152, name: 'Aruba', country: 'AW' },
  BON: { lat: 12.1310, lon: -68.2685, name: 'Bonaire', country: 'BQ' },
  PTP: { lat: 16.2653, lon: -61.5318, name: 'Pointe-à-Pitre', country: 'GP' },
  FDF: { lat: 14.5910, lon: -61.0032, name: 'Martinique', country: 'MQ' },
  SJU: { lat: 18.4394, lon: -66.0018, name: 'San Juan', country: 'PR' },
  PUJ: { lat: 18.5674, lon: -68.3634, name: 'Punta Cana', country: 'DO' },

  // --- Afrika ---
  JNB: { lat: -26.1392, lon: 28.2460, name: 'Johannesburg O.R. Tambo', country: 'ZA' },
  CPT: { lat: -33.9648, lon: 18.6017, name: 'Cape Town', country: 'ZA' },
  CAI: { lat: 30.1219, lon: 31.4056, name: 'Cairo', country: 'EG' },
  ADD: { lat: 8.9779, lon: 38.7993, name: 'Addis Ababa', country: 'ET' },
  CMN: { lat: 33.3675, lon: -7.5899, name: 'Casablanca', country: 'MA' },
  LOS: { lat: 6.5774, lon: 3.3215, name: 'Lagos', country: 'NG' },
  NBO: { lat: -1.3192, lon: 36.9275, name: 'Nairobi', country: 'KE' },

  // --- Oceanië ---
  SYD: { lat: -33.9461, lon: 151.1772, name: 'Sydney', country: 'AU' },
  MEL: { lat: -37.6690, lon: 144.8410, name: 'Melbourne', country: 'AU' },
  BNE: { lat: -27.3842, lon: 153.1175, name: 'Brisbane', country: 'AU' },
  PER: { lat: -31.9385, lon: 115.9672, name: 'Perth', country: 'AU' },
  AKL: { lat: -37.0082, lon: 174.7850, name: 'Auckland', country: 'NZ' },
};

// 3. Haversine afstand in statute miles

export const calculateDistance = (fromCode: string, toCode: string): number => {
  const from = AIRPORTS[fromCode];
  const to = AIRPORTS[toCode];

  if (!from || !to) return 0;

  const R = 3958.8; // Earth radius in statute miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);

  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

// 4. Flight type en distance band

export const getFlightType = (fromCode: string, toCode: string): FlightType => {
  const from = AIRPORTS[fromCode];
  const to = AIRPORTS[toCode];

  if (!from || !to) return 'International';

  if (from.country && to.country && from.country === to.country) {
    return 'Domestic';
  }

  return 'International';
};

/**
 * Flying Blue distance bands
 * Domestic: binnen één land
 * Medium: < 2000 miles
 * Long 1: 2000–3499 miles
 * Long 2: 3500–4999 miles
 * Long 3: >= 5000 miles
 */
export const getBandFromRoute = (fromCode: string, toCode: string): DistanceBand => {
  const flightType = getFlightType(fromCode, toCode);
  const distance = calculateDistance(fromCode, toCode);

  if (flightType === 'Domestic') {
    return 'Domestic';
  }

  if (distance < 2000) return 'Medium';
  if (distance < 3500) return 'Long 1';
  if (distance < 5000) return 'Long 2';
  return 'Long 3';
};

// Backwards compat helper
export const getBandFromDistance = (miles: number): DistanceBand => {
  if (miles < 2000) return 'Medium';
  if (miles < 3500) return 'Long 1';
  if (miles < 5000) return 'Long 2';
  return 'Long 3';
};

// 5. Officiële Flying Blue XP tabel

const XP_TABLE: Record<DistanceBand, Record<CabinClass, number>> = {
  Domestic: {
    Economy: 2,
    'Premium Economy': 4,
    Business: 6,
    First: 10,
  },
  Medium: {
    Economy: 5,
    'Premium Economy': 10,
    Business: 15,
    First: 25,
  },
  'Long 1': {
    Economy: 8,
    'Premium Economy': 16,
    Business: 24,
    First: 40,
  },
  'Long 2': {
    Economy: 10,
    'Premium Economy': 20,
    Business: 30,
    First: 50,
  },
  'Long 3': {
    Economy: 12,
    'Premium Economy': 24,
    Business: 36,
    First: 60,
  },
};

export const calculateXP = (band: DistanceBand, cabin: CabinClass): number => {
  return XP_TABLE[band][cabin];
};

export const calculateXPForRoute = (
  fromCode: string,
  toCode: string,
  cabin: CabinClass
): { distance: number; band: DistanceBand; xp: number } => {
  const distance = calculateDistance(fromCode, toCode);
  const band = getBandFromRoute(fromCode, toCode);
  const xp = calculateXP(band, cabin);

  return { distance, band, xp };
};

// 6. Kleine validatieset voor sanity checks in dev

interface XpValidationExample {
  from: string;
  to: string;
  cabin: CabinClass;
  expectedBand: DistanceBand;
  expectedXP: number;
}

const VALIDATION_EXAMPLES: XpValidationExample[] = [
  // Europees medium
  {
    from: 'AMS',
    to: 'CDG',
    cabin: 'Business',
    expectedBand: 'Medium',
    expectedXP: 15,
  },
  // Frankrijk Domestic Test (Cruciaal voor AF/Hop)
  {
    from: 'ORY',
    to: 'NCE',
    cabin: 'Economy',
    expectedBand: 'Domestic',
    expectedXP: 2,
  },
  // Oost-Europa Medium Check
  {
    from: 'AMS',
    to: 'KRK',
    cabin: 'Economy',
    expectedBand: 'Medium',
    expectedXP: 5,
  },
  // Long 2 voorbeeld AMS–JFK
  {
    from: 'AMS',
    to: 'JFK',
    cabin: 'Business',
    expectedBand: 'Long 2',
    expectedXP: 30,
  },
  // Long 3 voorbeeld CDG–JNB
  {
    from: 'CDG',
    to: 'JNB',
    cabin: 'Business',
    expectedBand: 'Long 3',
    expectedXP: 36,
  },
  // Domestic VS voorbeeld
  {
    from: 'JFK',
    to: 'ATL',
    cabin: 'Economy',
    expectedBand: 'Domestic',
    expectedXP: 2,
  },
];

export const validateXpLogic = (): { ok: boolean; failures: string[] } => {
  const failures: string[] = [];

  for (const ex of VALIDATION_EXAMPLES) {
    const { distance, band, xp } = calculateXPForRoute(ex.from, ex.to, ex.cabin);

    if (band !== ex.expectedBand) {
      failures.push(
        `${ex.from}-${ex.to} ${ex.cabin}: expected band ${ex.expectedBand}, got ${band} (distance ${distance} mi)`
      );
    }

    if (xp !== ex.expectedXP) {
      failures.push(
        `${ex.from}-${ex.to} ${ex.cabin}: expected XP ${ex.expectedXP}, got ${xp}`
      );
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  };
};