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

// 2. Database: Comprehensive global airport database

export const AIRPORTS: Record<string, AirportInfo> = {
  // =====================================================
  // AF-KLM HUBS
  // =====================================================
  AMS: { lat: 52.3086, lon: 4.7639, name: 'Amsterdam Schiphol', country: 'NL' },
  CDG: { lat: 49.0097, lon: 2.5479, name: 'Paris Charles de Gaulle', country: 'FR' },

  // =====================================================
  // EUROPE - BENELUX
  // =====================================================
  BRU: { lat: 50.9014, lon: 4.4844, name: 'Brussels', country: 'BE' },
  CRL: { lat: 50.4592, lon: 4.4538, name: 'Brussels South Charleroi', country: 'BE' },
  ANR: { lat: 51.1894, lon: 4.4603, name: 'Antwerp', country: 'BE' },
  LGG: { lat: 50.6374, lon: 5.4432, name: 'Liège', country: 'BE' },
  OST: { lat: 51.1989, lon: 2.8622, name: 'Ostend-Bruges', country: 'BE' },
  LUX: { lat: 49.6233, lon: 6.2044, name: 'Luxembourg', country: 'LU' },
  RTM: { lat: 51.9569, lon: 4.4372, name: 'Rotterdam The Hague', country: 'NL' },
  EIN: { lat: 51.4501, lon: 5.3745, name: 'Eindhoven', country: 'NL' },
  GRQ: { lat: 53.1197, lon: 6.5794, name: 'Groningen Eelde', country: 'NL' },
  MST: { lat: 50.9117, lon: 5.7703, name: 'Maastricht Aachen', country: 'NL' },

  // =====================================================
  // EUROPE - FRANCE
  // =====================================================
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
  CLY: { lat: 42.5305, lon: 8.7937, name: 'Calvi', country: 'FR' },
  FSC: { lat: 41.5006, lon: 9.0978, name: 'Figari', country: 'FR' },
  LIL: { lat: 50.5617, lon: 3.0894, name: 'Lille', country: 'FR' },
  RNS: { lat: 48.0694, lon: -1.7347, name: 'Rennes', country: 'FR' },
  ETZ: { lat: 48.9821, lon: 6.2513, name: 'Metz-Nancy-Lorraine', country: 'FR' },
  CFE: { lat: 45.7867, lon: 3.1631, name: 'Clermont-Ferrand', country: 'FR' },
  PGF: { lat: 42.7404, lon: 2.8706, name: 'Perpignan', country: 'FR' },
  TLN: { lat: 43.0973, lon: 6.1460, name: 'Toulon-Hyères', country: 'FR' },
  PUF: { lat: 43.3800, lon: -0.4186, name: 'Pau Pyrénées', country: 'FR' },
  LDE: { lat: 43.1787, lon: -0.0064, name: 'Tarbes-Lourdes', country: 'FR' },
  RDZ: { lat: 44.4079, lon: 2.4827, name: 'Rodez', country: 'FR' },
  LRH: { lat: 46.1792, lon: -1.1953, name: 'La Rochelle', country: 'FR' },
  PIS: { lat: 46.5877, lon: 0.3066, name: 'Poitiers', country: 'FR' },
  TUF: { lat: 47.4322, lon: 0.7276, name: 'Tours', country: 'FR' },
  CMF: { lat: 45.6381, lon: 5.8803, name: 'Chambéry', country: 'FR' },
  GNB: { lat: 45.3629, lon: 5.3294, name: 'Grenoble', country: 'FR' },
  EGC: { lat: 44.8253, lon: 0.5186, name: 'Bergerac', country: 'FR' },
  DCM: { lat: 43.5563, lon: 2.2892, name: 'Castres', country: 'FR' },
  AVN: { lat: 43.9073, lon: 4.9018, name: 'Avignon', country: 'FR' },
  BVA: { lat: 49.4544, lon: 2.1128, name: 'Paris Beauvais', country: 'FR' },

  // French Overseas
  PTP: { lat: 16.2653, lon: -61.5318, name: 'Pointe-à-Pitre (Guadeloupe)', country: 'GP' },
  FDF: { lat: 14.5910, lon: -61.0032, name: 'Fort-de-France (Martinique)', country: 'MQ' },
  CAY: { lat: 4.8192, lon: -52.3604, name: 'Cayenne (French Guiana)', country: 'GF' },
  RUN: { lat: -20.8871, lon: 55.5103, name: 'Saint-Denis (Réunion)', country: 'RE' },
  DZA: { lat: -12.8047, lon: 45.2811, name: 'Dzaoudzi (Mayotte)', country: 'YT' },
  NOU: { lat: -22.0146, lon: 166.2129, name: 'Nouméa (New Caledonia)', country: 'NC' },
  PPT: { lat: -17.5537, lon: -149.6069, name: 'Papeete (Tahiti)', country: 'PF' },
  SBH: { lat: 17.9044, lon: -62.8436, name: 'St. Barthélemy', country: 'BL' },
  SFG: { lat: 18.0999, lon: -63.0472, name: 'St. Martin Grand Case', country: 'MF' },

  // =====================================================
  // EUROPE - UK & IRELAND
  // =====================================================
  LHR: { lat: 51.4706, lon: -0.4619, name: 'London Heathrow', country: 'GB' },
  LGW: { lat: 51.1481, lon: -0.1903, name: 'London Gatwick', country: 'GB' },
  LCY: { lat: 51.5050, lon: 0.0544, name: 'London City', country: 'GB' },
  STN: { lat: 51.8850, lon: 0.2350, name: 'London Stansted', country: 'GB' },
  LTN: { lat: 51.8747, lon: -0.3683, name: 'London Luton', country: 'GB' },
  SEN: { lat: 51.5714, lon: 0.6956, name: 'London Southend', country: 'GB' },
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
  BHD: { lat: 54.6189, lon: -5.8725, name: 'George Best Belfast City', country: 'GB' },
  BFS: { lat: 54.6575, lon: -6.2158, name: 'Belfast International', country: 'GB' },
  LPL: { lat: 53.3336, lon: -2.8497, name: 'Liverpool', country: 'GB' },
  LBA: { lat: 53.8659, lon: -1.6606, name: 'Leeds Bradford', country: 'GB' },
  EMA: { lat: 52.8311, lon: -1.3281, name: 'East Midlands', country: 'GB' },
  EXT: { lat: 50.7344, lon: -3.4139, name: 'Exeter', country: 'GB' },
  BOH: { lat: 50.7800, lon: -1.8425, name: 'Bournemouth', country: 'GB' },
  DSA: { lat: 53.4747, lon: -1.0106, name: 'Doncaster Sheffield', country: 'GB' },
  PIK: { lat: 55.5094, lon: -4.5867, name: 'Glasgow Prestwick', country: 'GB' },
  JER: { lat: 49.2078, lon: -2.1956, name: 'Jersey', country: 'JE' },
  GCI: { lat: 49.4350, lon: -2.6020, name: 'Guernsey', country: 'GG' },
  IOM: { lat: 54.0833, lon: -4.6239, name: 'Isle of Man', country: 'IM' },
  DUB: { lat: 53.4213, lon: -6.2701, name: 'Dublin', country: 'IE' },
  ORK: { lat: 51.8413, lon: -8.4911, name: 'Cork', country: 'IE' },
  SNN: { lat: 52.7020, lon: -8.9248, name: 'Shannon', country: 'IE' },
  KIR: { lat: 52.1809, lon: -9.5238, name: 'Kerry', country: 'IE' },
  NOC: { lat: 53.9103, lon: -8.8186, name: 'Ireland West Knock', country: 'IE' },

  // =====================================================
  // EUROPE - GERMANY
  // =====================================================
  FRA: { lat: 50.0333, lon: 8.5706, name: 'Frankfurt', country: 'DE' },
  MUC: { lat: 48.3538, lon: 11.7861, name: 'Munich', country: 'DE' },
  BER: { lat: 52.3622, lon: 13.5007, name: 'Berlin Brandenburg', country: 'DE' },
  HAM: { lat: 53.6304, lon: 9.9882, name: 'Hamburg', country: 'DE' },
  DUS: { lat: 51.2895, lon: 6.7668, name: 'Düsseldorf', country: 'DE' },
  CGN: { lat: 50.8659, lon: 7.1427, name: 'Cologne Bonn', country: 'DE' },
  STR: { lat: 48.6899, lon: 9.2220, name: 'Stuttgart', country: 'DE' },
  HAJ: { lat: 52.4602, lon: 9.6835, name: 'Hanover', country: 'DE' },
  NUE: { lat: 49.4987, lon: 11.0780, name: 'Nuremberg', country: 'DE' },
  BRE: { lat: 53.0475, lon: 8.7867, name: 'Bremen', country: 'DE' },
  LEJ: { lat: 51.4324, lon: 12.2416, name: 'Leipzig/Halle', country: 'DE' },
  DRS: { lat: 51.1328, lon: 13.7672, name: 'Dresden', country: 'DE' },
  DTM: { lat: 51.5183, lon: 7.6122, name: 'Dortmund', country: 'DE' },
  FMO: { lat: 52.1346, lon: 7.6848, name: 'Münster Osnabrück', country: 'DE' },
  PAD: { lat: 51.6141, lon: 8.6163, name: 'Paderborn', country: 'DE' },
  HHN: { lat: 49.9487, lon: 7.2639, name: 'Frankfurt Hahn', country: 'DE' },
  NRN: { lat: 51.6024, lon: 6.1422, name: 'Weeze', country: 'DE' },
  FKB: { lat: 48.7794, lon: 8.0805, name: 'Karlsruhe/Baden-Baden', country: 'DE' },

  // =====================================================
  // EUROPE - SPAIN & PORTUGAL
  // =====================================================
  MAD: { lat: 40.4719, lon: -3.5626, name: 'Madrid-Barajas', country: 'ES' },
  BCN: { lat: 41.2971, lon: 2.0785, name: 'Barcelona-El Prat', country: 'ES' },
  AGP: { lat: 36.6749, lon: -4.4991, name: 'Málaga', country: 'ES' },
  VLC: { lat: 39.4893, lon: -0.4816, name: 'Valencia', country: 'ES' },
  BIO: { lat: 43.3011, lon: -2.9106, name: 'Bilbao', country: 'ES' },
  ALC: { lat: 38.2822, lon: -0.5582, name: 'Alicante', country: 'ES' },
  PMI: { lat: 39.5517, lon: 2.7388, name: 'Palma de Mallorca', country: 'ES' },
  SVQ: { lat: 37.4180, lon: -5.8931, name: 'Seville', country: 'ES' },
  IBZ: { lat: 38.8729, lon: 1.3731, name: 'Ibiza', country: 'ES' },
  MAH: { lat: 39.8626, lon: 4.2186, name: 'Menorca', country: 'ES' },
  TFS: { lat: 28.0445, lon: -16.5725, name: 'Tenerife South', country: 'ES' },
  TFN: { lat: 28.4827, lon: -16.3415, name: 'Tenerife North', country: 'ES' },
  LPA: { lat: 27.9319, lon: -15.3866, name: 'Gran Canaria', country: 'ES' },
  ACE: { lat: 28.9455, lon: -13.6052, name: 'Lanzarote', country: 'ES' },
  FUE: { lat: 28.4527, lon: -13.8638, name: 'Fuerteventura', country: 'ES' },
  SPC: { lat: 28.6265, lon: -17.7556, name: 'La Palma', country: 'ES' },
  GRX: { lat: 37.1887, lon: -3.7772, name: 'Granada', country: 'ES' },
  XRY: { lat: 36.7446, lon: -6.0601, name: 'Jerez de la Frontera', country: 'ES' },
  SDR: { lat: 43.4271, lon: -3.8200, name: 'Santander', country: 'ES' },
  OVD: { lat: 43.5636, lon: -6.0346, name: 'Asturias', country: 'ES' },
  SCQ: { lat: 42.8963, lon: -8.4151, name: 'Santiago de Compostela', country: 'ES' },
  VGO: { lat: 42.2318, lon: -8.6268, name: 'Vigo', country: 'ES' },
  ZAZ: { lat: 41.6662, lon: -1.0415, name: 'Zaragoza', country: 'ES' },
  MJV: { lat: 37.7749, lon: -0.8123, name: 'Murcia', country: 'ES' },
  REU: { lat: 41.1474, lon: 1.1672, name: 'Reus', country: 'ES' },
  GRO: { lat: 41.9010, lon: 2.7606, name: 'Girona', country: 'ES' },
  LIS: { lat: 38.7742, lon: -9.1342, name: 'Lisbon', country: 'PT' },
  OPO: { lat: 41.2481, lon: -8.6814, name: 'Porto', country: 'PT' },
  FAO: { lat: 37.0144, lon: -7.9659, name: 'Faro', country: 'PT' },
  FNC: { lat: 32.6979, lon: -16.7745, name: 'Funchal (Madeira)', country: 'PT' },
  PDL: { lat: 37.7412, lon: -25.6979, name: 'Ponta Delgada (Azores)', country: 'PT' },
  TER: { lat: 38.7618, lon: -27.0908, name: 'Terceira (Azores)', country: 'PT' },
  HOR: { lat: 38.5199, lon: -28.7159, name: 'Horta (Azores)', country: 'PT' },
  GIB: { lat: 36.1512, lon: -5.3497, name: 'Gibraltar', country: 'GI' },

  // =====================================================
  // EUROPE - ITALY
  // =====================================================
  FCO: { lat: 41.8003, lon: 12.2389, name: 'Rome Fiumicino', country: 'IT' },
  CIA: { lat: 41.7994, lon: 12.5949, name: 'Rome Ciampino', country: 'IT' },
  MXP: { lat: 45.6306, lon: 8.7281, name: 'Milan Malpensa', country: 'IT' },
  LIN: { lat: 45.4451, lon: 9.2767, name: 'Milan Linate', country: 'IT' },
  BGY: { lat: 45.6739, lon: 9.7042, name: 'Milan Bergamo', country: 'IT' },
  VCE: { lat: 45.5053, lon: 12.3519, name: 'Venice Marco Polo', country: 'IT' },
  TSF: { lat: 45.6484, lon: 12.1944, name: 'Venice Treviso', country: 'IT' },
  BLQ: { lat: 44.5350, lon: 11.2887, name: 'Bologna', country: 'IT' },
  NAP: { lat: 40.8844, lon: 14.2908, name: 'Naples', country: 'IT' },
  FLR: { lat: 43.8100, lon: 11.2051, name: 'Florence', country: 'IT' },
  PSA: { lat: 43.6839, lon: 10.3927, name: 'Pisa', country: 'IT' },
  TRN: { lat: 45.2008, lon: 7.6496, name: 'Turin', country: 'IT' },
  GOA: { lat: 44.4133, lon: 8.8550, name: 'Genoa', country: 'IT' },
  VRN: { lat: 45.3957, lon: 10.8885, name: 'Verona', country: 'IT' },
  CTA: { lat: 37.4667, lon: 15.0664, name: 'Catania', country: 'IT' },
  PMO: { lat: 38.1760, lon: 13.0910, name: 'Palermo', country: 'IT' },
  OLB: { lat: 40.8987, lon: 9.5176, name: 'Olbia', country: 'IT' },
  CAG: { lat: 39.2515, lon: 9.0543, name: 'Cagliari', country: 'IT' },
  AHO: { lat: 40.6321, lon: 8.2907, name: 'Alghero', country: 'IT' },
  BRI: { lat: 41.1389, lon: 16.7606, name: 'Bari', country: 'IT' },
  BDS: { lat: 40.6576, lon: 17.9470, name: 'Brindisi', country: 'IT' },
  TPS: { lat: 37.9114, lon: 12.4880, name: 'Trapani', country: 'IT' },
  CIY: { lat: 36.9946, lon: 14.6072, name: 'Comiso', country: 'IT' },
  SUF: { lat: 38.9054, lon: 16.2423, name: 'Lamezia Terme', country: 'IT' },
  REG: { lat: 38.0712, lon: 15.6516, name: 'Reggio Calabria', country: 'IT' },
  AOI: { lat: 43.6163, lon: 13.3623, name: 'Ancona', country: 'IT' },
  PEG: { lat: 43.0959, lon: 12.5132, name: 'Perugia', country: 'IT' },
  TRS: { lat: 45.8275, lon: 13.4722, name: 'Trieste', country: 'IT' },
  RMI: { lat: 44.0203, lon: 12.6117, name: 'Rimini', country: 'IT' },
  PMF: { lat: 44.8245, lon: 10.2964, name: 'Parma', country: 'IT' },

  // =====================================================
  // EUROPE - SWITZERLAND & AUSTRIA
  // =====================================================
  ZRH: { lat: 47.4647, lon: 8.5492, name: 'Zürich', country: 'CH' },
  GVA: { lat: 46.2381, lon: 6.1089, name: 'Geneva', country: 'CH' },
  BSL: { lat: 47.5900, lon: 7.5292, name: 'EuroAirport Basel-Mulhouse', country: 'CH' },
  BRN: { lat: 46.9141, lon: 7.4972, name: 'Bern', country: 'CH' },
  LUG: { lat: 46.0040, lon: 8.9106, name: 'Lugano', country: 'CH' },
  VIE: { lat: 48.1103, lon: 16.5697, name: 'Vienna', country: 'AT' },
  SZG: { lat: 47.7933, lon: 13.0043, name: 'Salzburg', country: 'AT' },
  INN: { lat: 47.2602, lon: 11.3439, name: 'Innsbruck', country: 'AT' },
  GRZ: { lat: 46.9911, lon: 15.4396, name: 'Graz', country: 'AT' },
  LNZ: { lat: 48.2332, lon: 14.1875, name: 'Linz', country: 'AT' },
  KLU: { lat: 46.6425, lon: 14.3377, name: 'Klagenfurt', country: 'AT' },

  // =====================================================
  // EUROPE - SCANDINAVIA & NORDICS
  // =====================================================
  CPH: { lat: 55.6179, lon: 12.6560, name: 'Copenhagen', country: 'DK' },
  BLL: { lat: 55.7403, lon: 9.1518, name: 'Billund', country: 'DK' },
  AAL: { lat: 57.0928, lon: 9.8492, name: 'Aalborg', country: 'DK' },
  AAR: { lat: 56.2990, lon: 10.6190, name: 'Aarhus', country: 'DK' },
  OSL: { lat: 60.1976, lon: 11.1004, name: 'Oslo Gardermoen', country: 'NO' },
  BGO: { lat: 60.2934, lon: 5.2181, name: 'Bergen', country: 'NO' },
  SVG: { lat: 58.8767, lon: 5.6378, name: 'Stavanger', country: 'NO' },
  TRD: { lat: 63.4578, lon: 10.9242, name: 'Trondheim', country: 'NO' },
  TOS: { lat: 69.6833, lon: 18.9189, name: 'Tromsø', country: 'NO' },
  BOO: { lat: 67.2692, lon: 14.3653, name: 'Bodø', country: 'NO' },
  AES: { lat: 62.5625, lon: 6.1197, name: 'Ålesund', country: 'NO' },
  KRS: { lat: 58.2042, lon: 8.0853, name: 'Kristiansand', country: 'NO' },
  HAU: { lat: 59.3453, lon: 5.2083, name: 'Haugesund', country: 'NO' },
  ARN: { lat: 59.6519, lon: 17.9186, name: 'Stockholm Arlanda', country: 'SE' },
  GOT: { lat: 57.6628, lon: 12.2798, name: 'Gothenburg Landvetter', country: 'SE' },
  MMX: { lat: 55.5363, lon: 13.3762, name: 'Malmö', country: 'SE' },
  LLA: { lat: 65.5438, lon: 22.1220, name: 'Luleå', country: 'SE' },
  UME: { lat: 63.7919, lon: 20.2828, name: 'Umeå', country: 'SE' },
  VBY: { lat: 57.6628, lon: 18.3462, name: 'Visby', country: 'SE' },
  LPI: { lat: 58.4132, lon: 15.5256, name: 'Linköping', country: 'SE' },
  NYO: { lat: 58.7886, lon: 16.9122, name: 'Stockholm Skavsta', country: 'SE' },
  HEL: { lat: 60.3172, lon: 24.9633, name: 'Helsinki-Vantaa', country: 'FI' },
  TMP: { lat: 61.4147, lon: 23.6044, name: 'Tampere', country: 'FI' },
  TKU: { lat: 60.5141, lon: 22.2628, name: 'Turku', country: 'FI' },
  OUL: { lat: 64.9301, lon: 25.3546, name: 'Oulu', country: 'FI' },
  RVN: { lat: 66.5648, lon: 25.8304, name: 'Rovaniemi', country: 'FI' },
  KEF: { lat: 63.9850, lon: -22.6056, name: 'Reykjavík Keflavík', country: 'IS' },
  AKU: { lat: 65.6597, lon: -18.0727, name: 'Akureyri', country: 'IS' },

  // =====================================================
  // EUROPE - BALTICS
  // =====================================================
  TLL: { lat: 59.4133, lon: 24.8328, name: 'Tallinn', country: 'EE' },
  TRT: { lat: 58.3075, lon: 26.6904, name: 'Tartu', country: 'EE' },
  RIX: { lat: 56.9236, lon: 23.9711, name: 'Riga', country: 'LV' },
  VNO: { lat: 54.6341, lon: 25.2858, name: 'Vilnius', country: 'LT' },
  KUN: { lat: 54.9639, lon: 24.0848, name: 'Kaunas', country: 'LT' },
  PLQ: { lat: 55.9733, lon: 21.0939, name: 'Palanga', country: 'LT' },

  // =====================================================
  // EUROPE - POLAND & CENTRAL EUROPE
  // =====================================================
  WAW: { lat: 52.1657, lon: 20.9671, name: 'Warsaw Chopin', country: 'PL' },
  WMI: { lat: 52.4511, lon: 20.6518, name: 'Warsaw Modlin', country: 'PL' },
  KRK: { lat: 50.0777, lon: 19.7848, name: 'Kraków', country: 'PL' },
  GDN: { lat: 54.3776, lon: 18.4662, name: 'Gdańsk', country: 'PL' },
  WRO: { lat: 51.1027, lon: 16.8858, name: 'Wrocław', country: 'PL' },
  POZ: { lat: 52.4210, lon: 16.8263, name: 'Poznań', country: 'PL' },
  KTW: { lat: 50.4743, lon: 19.0800, name: 'Katowice', country: 'PL' },
  RZE: { lat: 50.1100, lon: 22.0190, name: 'Rzeszów', country: 'PL' },
  SZZ: { lat: 53.5847, lon: 14.9022, name: 'Szczecin', country: 'PL' },
  LCJ: { lat: 51.7219, lon: 19.3981, name: 'Łódź', country: 'PL' },
  BZG: { lat: 53.0968, lon: 17.9777, name: 'Bydgoszcz', country: 'PL' },
  PRG: { lat: 50.1008, lon: 14.2600, name: 'Prague', country: 'CZ' },
  BRQ: { lat: 49.1513, lon: 16.6944, name: 'Brno', country: 'CZ' },
  OSR: { lat: 49.6963, lon: 18.1111, name: 'Ostrava', country: 'CZ' },
  BTS: { lat: 48.1702, lon: 17.2127, name: 'Bratislava', country: 'SK' },
  KSC: { lat: 48.6631, lon: 21.2411, name: 'Košice', country: 'SK' },
  BUD: { lat: 47.4369, lon: 19.2556, name: 'Budapest', country: 'HU' },
  DEB: { lat: 47.4889, lon: 21.6153, name: 'Debrecen', country: 'HU' },

  // =====================================================
  // EUROPE - ROMANIA & BULGARIA
  // =====================================================
  OTP: { lat: 44.5722, lon: 26.1022, name: 'Bucharest Otopeni', country: 'RO' },
  BBU: { lat: 44.5032, lon: 26.1021, name: 'Bucharest Băneasa', country: 'RO' },
  CLJ: { lat: 46.7852, lon: 23.6862, name: 'Cluj-Napoca', country: 'RO' },
  TSR: { lat: 45.8099, lon: 21.3379, name: 'Timișoara', country: 'RO' },
  IAS: { lat: 47.1785, lon: 27.6206, name: 'Iași', country: 'RO' },
  SBZ: { lat: 45.7856, lon: 24.0913, name: 'Sibiu', country: 'RO' },
  SUJ: { lat: 47.7033, lon: 22.8857, name: 'Satu Mare', country: 'RO' },
  OMR: { lat: 47.0252, lon: 21.9025, name: 'Oradea', country: 'RO' },
  CND: { lat: 44.3622, lon: 28.4883, name: 'Constanța', country: 'RO' },
  TGM: { lat: 46.4677, lon: 24.4125, name: 'Târgu Mureș', country: 'RO' },
  CRA: { lat: 44.3181, lon: 23.8889, name: 'Craiova', country: 'RO' },
  SOF: { lat: 42.6967, lon: 23.4114, name: 'Sofia', country: 'BG' },
  VAR: { lat: 43.2321, lon: 27.8251, name: 'Varna', country: 'BG' },
  BOJ: { lat: 42.5696, lon: 27.5152, name: 'Burgas', country: 'BG' },
  PDV: { lat: 42.0678, lon: 24.8508, name: 'Plovdiv', country: 'BG' },

  // =====================================================
  // EUROPE - BALKANS
  // =====================================================
  LJU: { lat: 46.2237, lon: 14.4576, name: 'Ljubljana', country: 'SI' },
  ZAG: { lat: 45.7429, lon: 16.0688, name: 'Zagreb', country: 'HR' },
  SPU: { lat: 43.5389, lon: 16.2980, name: 'Split', country: 'HR' },
  DBV: { lat: 42.5614, lon: 18.2682, name: 'Dubrovnik', country: 'HR' },
  PUY: { lat: 44.8935, lon: 13.9222, name: 'Pula', country: 'HR' },
  ZAD: { lat: 44.1083, lon: 15.3467, name: 'Zadar', country: 'HR' },
  RJK: { lat: 45.2169, lon: 14.5703, name: 'Rijeka', country: 'HR' },
  OSI: { lat: 45.4627, lon: 18.8102, name: 'Osijek', country: 'HR' },
  BEG: { lat: 44.8184, lon: 20.3091, name: 'Belgrade', country: 'RS' },
  INI: { lat: 43.3372, lon: 21.8536, name: 'Niš', country: 'RS' },
  PRN: { lat: 42.5728, lon: 21.0358, name: 'Pristina', country: 'XK' },
  SJJ: { lat: 43.8246, lon: 18.3315, name: 'Sarajevo', country: 'BA' },
  TZL: { lat: 44.4587, lon: 18.7248, name: 'Tuzla', country: 'BA' },
  TGD: { lat: 42.3594, lon: 19.2519, name: 'Podgorica', country: 'ME' },
  TIV: { lat: 42.4047, lon: 18.7233, name: 'Tivat', country: 'ME' },
  SKP: { lat: 41.9616, lon: 21.6214, name: 'Skopje', country: 'MK' },
  OHD: { lat: 41.1800, lon: 20.7423, name: 'Ohrid', country: 'MK' },
  TIA: { lat: 41.4147, lon: 19.7206, name: 'Tirana', country: 'AL' },

  // =====================================================
  // EUROPE - GREECE & CYPRUS
  // =====================================================
  ATH: { lat: 37.9364, lon: 23.9445, name: 'Athens', country: 'GR' },
  SKG: { lat: 40.5197, lon: 22.9709, name: 'Thessaloniki', country: 'GR' },
  HER: { lat: 35.3397, lon: 25.1803, name: 'Heraklion (Crete)', country: 'GR' },
  CHQ: { lat: 35.5317, lon: 24.1497, name: 'Chania (Crete)', country: 'GR' },
  RHO: { lat: 36.4054, lon: 28.0862, name: 'Rhodes', country: 'GR' },
  KGS: { lat: 36.7933, lon: 27.0917, name: 'Kos', country: 'GR' },
  CFU: { lat: 39.6019, lon: 19.9117, name: 'Corfu', country: 'GR' },
  JMK: { lat: 37.4351, lon: 25.3481, name: 'Mykonos', country: 'GR' },
  JTR: { lat: 36.3992, lon: 25.4793, name: 'Santorini', country: 'GR' },
  ZTH: { lat: 37.7509, lon: 20.8843, name: 'Zakynthos', country: 'GR' },
  KVA: { lat: 40.9133, lon: 24.6192, name: 'Kavala', country: 'GR' },
  SMI: { lat: 37.6900, lon: 26.9117, name: 'Samos', country: 'GR' },
  MJT: { lat: 39.0567, lon: 26.5983, name: 'Mytilene (Lesbos)', country: 'GR' },
  EFL: { lat: 38.1200, lon: 20.5006, name: 'Kefalonia', country: 'GR' },
  PVK: { lat: 38.9256, lon: 20.7653, name: 'Preveza', country: 'GR' },
  VOL: { lat: 39.2197, lon: 22.7944, name: 'Volos', country: 'GR' },
  IOA: { lat: 39.6964, lon: 20.8225, name: 'Ioannina', country: 'GR' },
  LCA: { lat: 34.8751, lon: 33.6249, name: 'Larnaca', country: 'CY' },
  PFO: { lat: 34.7180, lon: 32.4857, name: 'Paphos', country: 'CY' },
  ECN: { lat: 35.1547, lon: 33.4961, name: 'Ercan (North Cyprus)', country: 'CY' },

  // =====================================================
  // EUROPE - TURKEY
  // =====================================================
  IST: { lat: 41.2753, lon: 28.7520, name: 'Istanbul', country: 'TR' },
  SAW: { lat: 40.8986, lon: 29.3092, name: 'Istanbul Sabiha Gökçen', country: 'TR' },
  AYT: { lat: 36.8987, lon: 30.8005, name: 'Antalya', country: 'TR' },
  ADB: { lat: 38.2924, lon: 27.1570, name: 'Izmir', country: 'TR' },
  ESB: { lat: 40.1281, lon: 32.9951, name: 'Ankara Esenboğa', country: 'TR' },
  DLM: { lat: 36.7131, lon: 28.7925, name: 'Dalaman', country: 'TR' },
  BJV: { lat: 37.2506, lon: 27.6643, name: 'Bodrum', country: 'TR' },
  GZT: { lat: 36.9472, lon: 37.4787, name: 'Gaziantep', country: 'TR' },
  TZX: { lat: 40.9950, lon: 39.7897, name: 'Trabzon', country: 'TR' },
  VAN: { lat: 38.4682, lon: 43.3323, name: 'Van', country: 'TR' },
  KYA: { lat: 37.9790, lon: 32.5619, name: 'Konya', country: 'TR' },
  ASR: { lat: 38.7704, lon: 35.4954, name: 'Kayseri', country: 'TR' },
  ADA: { lat: 36.9822, lon: 35.2804, name: 'Adana', country: 'TR' },
  DIY: { lat: 37.8939, lon: 40.2010, name: 'Diyarbakır', country: 'TR' },
  ERZ: { lat: 39.9565, lon: 41.1702, name: 'Erzurum', country: 'TR' },
  SZF: { lat: 41.2545, lon: 36.5671, name: 'Samsun', country: 'TR' },

  // =====================================================
  // EUROPE - RUSSIA & CIS (limited due to sanctions)
  // =====================================================
  SVO: { lat: 55.9726, lon: 37.4146, name: 'Moscow Sheremetyevo', country: 'RU' },
  DME: { lat: 55.4088, lon: 37.9063, name: 'Moscow Domodedovo', country: 'RU' },
  VKO: { lat: 55.5915, lon: 37.2615, name: 'Moscow Vnukovo', country: 'RU' },
  LED: { lat: 59.8003, lon: 30.2625, name: 'St. Petersburg', country: 'RU' },
  KIV: { lat: 46.9277, lon: 28.9313, name: 'Chișinău', country: 'MD' },
  IEV: { lat: 50.4019, lon: 30.4497, name: 'Kyiv Zhuliany', country: 'UA' },
  KBP: { lat: 50.3450, lon: 30.8947, name: 'Kyiv Boryspil', country: 'UA' },
  ODS: { lat: 46.4268, lon: 30.6765, name: 'Odessa', country: 'UA' },
  LWO: { lat: 49.8125, lon: 23.9561, name: 'Lviv', country: 'UA' },
  TBS: { lat: 41.6692, lon: 44.9547, name: 'Tbilisi', country: 'GE' },
  BUS: { lat: 41.6103, lon: 41.5997, name: 'Batumi', country: 'GE' },
  KUT: { lat: 42.1767, lon: 42.4826, name: 'Kutaisi', country: 'GE' },
  EVN: { lat: 40.1473, lon: 44.3959, name: 'Yerevan', country: 'AM' },
  GYD: { lat: 40.4675, lon: 50.0467, name: 'Baku', country: 'AZ' },
  MSQ: { lat: 53.8825, lon: 28.0307, name: 'Minsk', country: 'BY' },
  ALA: { lat: 43.3521, lon: 77.0405, name: 'Almaty', country: 'KZ' },
  NQZ: { lat: 51.0222, lon: 71.4669, name: 'Astana', country: 'KZ' },
  TAS: { lat: 41.2579, lon: 69.2812, name: 'Tashkent', country: 'UZ' },

  // =====================================================
  // MIDDLE EAST
  // =====================================================
  DXB: { lat: 25.2532, lon: 55.3657, name: 'Dubai', country: 'AE' },
  AUH: { lat: 24.4330, lon: 54.6511, name: 'Abu Dhabi', country: 'AE' },
  SHJ: { lat: 25.3286, lon: 55.5172, name: 'Sharjah', country: 'AE' },
  DOH: { lat: 25.2731, lon: 51.6081, name: 'Doha Hamad', country: 'QA' },
  BAH: { lat: 26.2708, lon: 50.6336, name: 'Bahrain', country: 'BH' },
  KWI: { lat: 29.2266, lon: 47.9689, name: 'Kuwait', country: 'KW' },
  MCT: { lat: 23.5933, lon: 58.2844, name: 'Muscat', country: 'OM' },
  SLL: { lat: 17.0387, lon: 54.0914, name: 'Salalah', country: 'OM' },
  RUH: { lat: 24.9578, lon: 46.6989, name: 'Riyadh', country: 'SA' },
  JED: { lat: 21.6796, lon: 39.1565, name: 'Jeddah', country: 'SA' },
  DMM: { lat: 26.4712, lon: 49.7979, name: 'Dammam', country: 'SA' },
  MED: { lat: 24.5534, lon: 39.7051, name: 'Medina', country: 'SA' },
  AMM: { lat: 31.7226, lon: 35.9932, name: 'Amman Queen Alia', country: 'JO' },
  AQJ: { lat: 29.6116, lon: 35.0181, name: 'Aqaba', country: 'JO' },
  BEY: { lat: 33.8209, lon: 35.4884, name: 'Beirut', country: 'LB' },
  TLV: { lat: 32.0114, lon: 34.8867, name: 'Tel Aviv Ben Gurion', country: 'IL' },
  SDV: { lat: 32.1147, lon: 34.7822, name: 'Tel Aviv Sde Dov', country: 'IL' },
  IKA: { lat: 35.4161, lon: 51.1522, name: 'Tehran Imam Khomeini', country: 'IR' },
  THR: { lat: 35.6892, lon: 51.3134, name: 'Tehran Mehrabad', country: 'IR' },
  ISU: { lat: 35.5456, lon: 45.3168, name: 'Sulaymaniyah', country: 'IQ' },
  EBL: { lat: 36.2376, lon: 43.9632, name: 'Erbil', country: 'IQ' },
  BGW: { lat: 33.2625, lon: 44.2346, name: 'Baghdad', country: 'IQ' },
  BSR: { lat: 30.5491, lon: 47.6621, name: 'Basra', country: 'IQ' },
  DAM: { lat: 33.4115, lon: 36.5156, name: 'Damascus', country: 'SY' },

  // =====================================================
  // AFRICA - NORTH
  // =====================================================
  CAI: { lat: 30.1219, lon: 31.4056, name: 'Cairo', country: 'EG' },
  HRG: { lat: 27.1783, lon: 33.7994, name: 'Hurghada', country: 'EG' },
  SSH: { lat: 27.9773, lon: 34.3950, name: 'Sharm El Sheikh', country: 'EG' },
  LXR: { lat: 25.6708, lon: 32.7069, name: 'Luxor', country: 'EG' },
  ASW: { lat: 23.9644, lon: 32.8200, name: 'Aswan', country: 'EG' },
  ALY: { lat: 31.1839, lon: 29.9489, name: 'Alexandria Borg El Arab', country: 'EG' },
  ALG: { lat: 36.6910, lon: 3.2154, name: 'Algiers', country: 'DZ' },
  ORN: { lat: 35.6240, lon: -0.6211, name: 'Oran', country: 'DZ' },
  CZL: { lat: 36.2761, lon: 6.6204, name: 'Constantine', country: 'DZ' },
  AAE: { lat: 36.8222, lon: 7.8092, name: 'Annaba', country: 'DZ' },
  TUN: { lat: 36.8510, lon: 10.2272, name: 'Tunis-Carthage', country: 'TN' },
  DJE: { lat: 33.8750, lon: 10.7755, name: 'Djerba', country: 'TN' },
  MIR: { lat: 35.7581, lon: 10.7547, name: 'Monastir', country: 'TN' },
  SFA: { lat: 34.7180, lon: 10.6910, name: 'Sfax', country: 'TN' },
  NBE: { lat: 36.0758, lon: 10.4386, name: 'Enfidha', country: 'TN' },
  CMN: { lat: 33.3675, lon: -7.5897, name: 'Casablanca Mohammed V', country: 'MA' },
  RAK: { lat: 31.6069, lon: -8.0363, name: 'Marrakech', country: 'MA' },
  AGA: { lat: 30.3250, lon: -9.4131, name: 'Agadir', country: 'MA' },
  FEZ: { lat: 33.9272, lon: -4.9780, name: 'Fes', country: 'MA' },
  TNG: { lat: 35.7269, lon: -5.9169, name: 'Tangier', country: 'MA' },
  RBA: { lat: 34.0515, lon: -6.7515, name: 'Rabat', country: 'MA' },
  NDR: { lat: 34.9888, lon: -3.0282, name: 'Nador', country: 'MA' },
  OUD: { lat: 34.7872, lon: -1.9240, name: 'Oujda', country: 'MA' },
  ESU: { lat: 31.3975, lon: -9.6817, name: 'Essaouira', country: 'MA' },
  OZZ: { lat: 30.9391, lon: -6.9094, name: 'Ouarzazate', country: 'MA' },
  ERH: { lat: 31.9475, lon: -4.3983, name: 'Errachidia', country: 'MA' },
  TTP: { lat: 28.4485, lon: -11.1613, name: 'Tan Tan', country: 'MA' },
  EUN: { lat: 27.1517, lon: -13.2192, name: 'Laâyoune', country: 'EH' },
  TIP: { lat: 32.6635, lon: 13.1590, name: 'Tripoli', country: 'LY' },
  BEN: { lat: 32.0968, lon: 20.2695, name: 'Benghazi', country: 'LY' },

  // =====================================================
  // AFRICA - WEST
  // =====================================================
  DSS: { lat: 14.7397, lon: -17.4902, name: 'Dakar Blaise Diagne', country: 'SN' },
  ABJ: { lat: 5.2614, lon: -3.9262, name: 'Abidjan', country: 'CI' },
  ACC: { lat: 5.6052, lon: -0.1668, name: 'Accra Kotoka', country: 'GH' },
  LOS: { lat: 6.5774, lon: 3.3212, name: 'Lagos', country: 'NG' },
  ABV: { lat: 9.0068, lon: 7.2632, name: 'Abuja', country: 'NG' },
  PHC: { lat: 5.0154, lon: 6.9496, name: 'Port Harcourt', country: 'NG' },
  KAN: { lat: 12.0476, lon: 8.5246, name: 'Kano', country: 'NG' },
  DKR: { lat: 14.6697, lon: -17.0728, name: 'Dakar Léopold Sédar Senghor', country: 'SN' },
  COO: { lat: 6.3573, lon: 2.3844, name: 'Cotonou', country: 'BJ' },
  LFW: { lat: 6.1656, lon: 1.2545, name: 'Lomé', country: 'TG' },
  OUA: { lat: 12.3532, lon: -1.5124, name: 'Ouagadougou', country: 'BF' },
  BKO: { lat: 12.5335, lon: -7.9499, name: 'Bamako', country: 'ML' },
  NIM: { lat: 13.4815, lon: 2.1835, name: 'Niamey', country: 'NE' },
  CKY: { lat: 9.5769, lon: -13.6120, name: 'Conakry', country: 'GN' },
  FNA: { lat: 8.6164, lon: -13.1955, name: 'Freetown Lungi', country: 'SL' },
  ROB: { lat: 6.2338, lon: -10.3623, name: 'Monrovia Roberts', country: 'LR' },
  BJL: { lat: 13.3380, lon: -16.6522, name: 'Banjul', country: 'GM' },
  RAI: { lat: 14.9245, lon: -23.4935, name: 'Praia', country: 'CV' },
  SID: { lat: 16.7414, lon: -22.9494, name: 'Sal', country: 'CV' },
  BVC: { lat: 16.1365, lon: -22.8889, name: 'Boa Vista', country: 'CV' },
  NKC: { lat: 18.0969, lon: -15.9486, name: 'Nouakchott', country: 'MR' },

  // =====================================================
  // AFRICA - CENTRAL
  // =====================================================
  DLA: { lat: 4.0061, lon: 9.7195, name: 'Douala', country: 'CM' },
  NSI: { lat: 3.7226, lon: 11.5533, name: 'Yaoundé Nsimalen', country: 'CM' },
  LBV: { lat: 0.4586, lon: 9.4123, name: 'Libreville', country: 'GA' },
  POG: { lat: -0.7117, lon: 8.7543, name: 'Port-Gentil', country: 'GA' },
  SSG: { lat: 3.7553, lon: 8.7087, name: 'Malabo', country: 'GQ' },
  FIH: { lat: -4.3858, lon: 15.4446, name: 'Kinshasa', country: 'CD' },
  FBM: { lat: -11.5913, lon: 27.5309, name: 'Lubumbashi', country: 'CD' },
  BZV: { lat: -4.2517, lon: 15.2530, name: 'Brazzaville', country: 'CG' },
  PNR: { lat: -4.8161, lon: 11.8866, name: 'Pointe-Noire', country: 'CG' },
  BGF: { lat: 4.3985, lon: 18.5188, name: 'Bangui', country: 'CF' },
  NDJ: { lat: 12.1337, lon: 15.0340, name: 'N\'Djamena', country: 'TD' },
  STP: { lat: 0.3782, lon: 6.7121, name: 'São Tomé', country: 'ST' },
  LAD: { lat: -8.8584, lon: 13.2312, name: 'Luanda', country: 'AO' },

  // =====================================================
  // AFRICA - EAST
  // =====================================================
  NBO: { lat: -1.3192, lon: 36.9278, name: 'Nairobi Jomo Kenyatta', country: 'KE' },
  MBA: { lat: -4.0348, lon: 39.5942, name: 'Mombasa', country: 'KE' },
  ADD: { lat: 8.9779, lon: 38.7993, name: 'Addis Ababa Bole', country: 'ET' },
  DAR: { lat: -6.8781, lon: 39.2026, name: 'Dar es Salaam', country: 'TZ' },
  JRO: { lat: -3.4294, lon: 37.0745, name: 'Kilimanjaro', country: 'TZ' },
  ZNZ: { lat: -6.2220, lon: 39.2249, name: 'Zanzibar', country: 'TZ' },
  EBB: { lat: 0.0424, lon: 32.4435, name: 'Entebbe', country: 'UG' },
  KGL: { lat: -1.9686, lon: 30.1395, name: 'Kigali', country: 'RW' },
  BJM: { lat: -3.3240, lon: 29.3185, name: 'Bujumbura', country: 'BI' },
  ASM: { lat: 15.2919, lon: 38.9107, name: 'Asmara', country: 'ER' },
  JIB: { lat: 11.5473, lon: 43.1595, name: 'Djibouti', country: 'DJ' },
  MGQ: { lat: 2.0144, lon: 45.3050, name: 'Mogadishu', country: 'SO' },
  SEZ: { lat: -4.6743, lon: 55.5218, name: 'Mahé (Seychelles)', country: 'SC' },
  MRU: { lat: -20.4302, lon: 57.6836, name: 'Mauritius', country: 'MU' },
  TNR: { lat: -18.7969, lon: 47.4788, name: 'Antananarivo', country: 'MG' },
  NOS: { lat: -13.3121, lon: 48.3148, name: 'Nosy Be', country: 'MG' },
  HAH: { lat: -11.5337, lon: 43.2719, name: 'Moroni (Comoros)', country: 'KM' },

  // =====================================================
  // AFRICA - SOUTH
  // =====================================================
  JNB: { lat: -26.1392, lon: 28.2460, name: 'Johannesburg O.R. Tambo', country: 'ZA' },
  CPT: { lat: -33.9649, lon: 18.6017, name: 'Cape Town', country: 'ZA' },
  DUR: { lat: -29.6144, lon: 31.1197, name: 'Durban King Shaka', country: 'ZA' },
  PLZ: { lat: -33.9849, lon: 25.6173, name: 'Port Elizabeth', country: 'ZA' },
  GRJ: { lat: -34.0056, lon: 22.3789, name: 'George', country: 'ZA' },
  BFN: { lat: -29.0927, lon: 26.3024, name: 'Bloemfontein', country: 'ZA' },
  ELS: { lat: -33.0356, lon: 27.8259, name: 'East London', country: 'ZA' },
  HRE: { lat: -17.9318, lon: 31.0928, name: 'Harare', country: 'ZW' },
  VFA: { lat: -18.0959, lon: 25.8390, name: 'Victoria Falls', country: 'ZW' },
  LUN: { lat: -15.3308, lon: 28.4526, name: 'Lusaka', country: 'ZM' },
  LVI: { lat: -17.8218, lon: 25.8227, name: 'Livingstone', country: 'ZM' },
  LLW: { lat: -13.7894, lon: 33.7811, name: 'Lilongwe', country: 'MW' },
  BLZ: { lat: -15.6791, lon: 34.9740, name: 'Blantyre', country: 'MW' },
  MPM: { lat: -25.9208, lon: 32.5726, name: 'Maputo', country: 'MZ' },
  GBE: { lat: -24.5552, lon: 25.9182, name: 'Gaborone', country: 'BW' },
  WDH: { lat: -22.4799, lon: 17.4709, name: 'Windhoek Hosea Kutako', country: 'NA' },
  MQP: { lat: -25.3832, lon: 31.1056, name: 'Mbombela/Kruger', country: 'ZA' },

  // =====================================================
  // ASIA - EAST
  // =====================================================
  PEK: { lat: 40.0799, lon: 116.6031, name: 'Beijing Capital', country: 'CN' },
  PKX: { lat: 39.5098, lon: 116.4105, name: 'Beijing Daxing', country: 'CN' },
  PVG: { lat: 31.1434, lon: 121.8052, name: 'Shanghai Pudong', country: 'CN' },
  SHA: { lat: 31.1979, lon: 121.3363, name: 'Shanghai Hongqiao', country: 'CN' },
  CAN: { lat: 23.3924, lon: 113.2988, name: 'Guangzhou', country: 'CN' },
  SZX: { lat: 22.6393, lon: 113.8107, name: 'Shenzhen', country: 'CN' },
  CTU: { lat: 30.5785, lon: 103.9471, name: 'Chengdu Shuangliu', country: 'CN' },
  TFU: { lat: 30.3197, lon: 104.4469, name: 'Chengdu Tianfu', country: 'CN' },
  CKG: { lat: 29.7192, lon: 106.6417, name: 'Chongqing', country: 'CN' },
  XIY: { lat: 34.4371, lon: 108.7519, name: 'Xi\'an', country: 'CN' },
  HGH: { lat: 30.2295, lon: 120.4344, name: 'Hangzhou', country: 'CN' },
  NKG: { lat: 31.7420, lon: 118.8620, name: 'Nanjing', country: 'CN' },
  WUH: { lat: 30.7838, lon: 114.2081, name: 'Wuhan', country: 'CN' },
  CSX: { lat: 28.1892, lon: 113.2200, name: 'Changsha', country: 'CN' },
  TAO: { lat: 36.2661, lon: 120.3744, name: 'Qingdao', country: 'CN' },
  XMN: { lat: 24.5440, lon: 118.1278, name: 'Xiamen', country: 'CN' },
  KMG: { lat: 25.1019, lon: 102.9292, name: 'Kunming', country: 'CN' },
  SYX: { lat: 18.3029, lon: 109.4122, name: 'Sanya', country: 'CN' },
  HAK: { lat: 19.9349, lon: 110.4590, name: 'Haikou', country: 'CN' },
  DLC: { lat: 38.9657, lon: 121.5386, name: 'Dalian', country: 'CN' },
  TSN: { lat: 39.1246, lon: 117.3462, name: 'Tianjin', country: 'CN' },
  URC: { lat: 43.9071, lon: 87.4742, name: 'Ürümqi', country: 'CN' },
  HRB: { lat: 45.6234, lon: 126.2500, name: 'Harbin', country: 'CN' },
  SHE: { lat: 41.6398, lon: 123.4833, name: 'Shenyang', country: 'CN' },
  CGO: { lat: 34.5197, lon: 113.8408, name: 'Zhengzhou', country: 'CN' },
  HKG: { lat: 22.3080, lon: 113.9185, name: 'Hong Kong', country: 'HK' },
  MFM: { lat: 22.1496, lon: 113.5920, name: 'Macau', country: 'MO' },
  TPE: { lat: 25.0777, lon: 121.2328, name: 'Taipei Taoyuan', country: 'TW' },
  TSA: { lat: 25.0694, lon: 121.5525, name: 'Taipei Songshan', country: 'TW' },
  KHH: { lat: 22.5771, lon: 120.3500, name: 'Kaohsiung', country: 'TW' },
  NRT: { lat: 35.7720, lon: 140.3929, name: 'Tokyo Narita', country: 'JP' },
  HND: { lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda', country: 'JP' },
  KIX: { lat: 34.4320, lon: 135.2304, name: 'Osaka Kansai', country: 'JP' },
  ITM: { lat: 34.7854, lon: 135.4385, name: 'Osaka Itami', country: 'JP' },
  NGO: { lat: 34.8584, lon: 136.8050, name: 'Nagoya Chubu', country: 'JP' },
  FUK: { lat: 33.5859, lon: 130.4511, name: 'Fukuoka', country: 'JP' },
  CTS: { lat: 42.7752, lon: 141.6924, name: 'Sapporo New Chitose', country: 'JP' },
  OKA: { lat: 26.1958, lon: 127.6459, name: 'Okinawa Naha', country: 'JP' },
  ICN: { lat: 37.4691, lon: 126.4505, name: 'Seoul Incheon', country: 'KR' },
  GMP: { lat: 37.5583, lon: 126.7906, name: 'Seoul Gimpo', country: 'KR' },
  PUS: { lat: 35.1795, lon: 128.9381, name: 'Busan', country: 'KR' },
  CJU: { lat: 33.5113, lon: 126.4929, name: 'Jeju', country: 'KR' },
  ULN: { lat: 47.8431, lon: 106.7666, name: 'Ulaanbaatar', country: 'MN' },
  FNJ: { lat: 39.2241, lon: 125.6700, name: 'Pyongyang', country: 'KP' },

  // =====================================================
  // ASIA - SOUTHEAST
  // =====================================================
  SIN: { lat: 1.3644, lon: 103.9915, name: 'Singapore Changi', country: 'SG' },
  BKK: { lat: 13.6900, lon: 100.7501, name: 'Bangkok Suvarnabhumi', country: 'TH' },
  DMK: { lat: 13.9126, lon: 100.6068, name: 'Bangkok Don Mueang', country: 'TH' },
  HKT: { lat: 8.1132, lon: 98.3169, name: 'Phuket', country: 'TH' },
  CNX: { lat: 18.7668, lon: 98.9626, name: 'Chiang Mai', country: 'TH' },
  USM: { lat: 9.5478, lon: 100.0623, name: 'Koh Samui', country: 'TH' },
  KBV: { lat: 8.0992, lon: 98.9862, name: 'Krabi', country: 'TH' },
  HDY: { lat: 6.9332, lon: 100.3930, name: 'Hat Yai', country: 'TH' },
  KUL: { lat: 2.7456, lon: 101.7099, name: 'Kuala Lumpur', country: 'MY' },
  SZB: { lat: 3.1308, lon: 101.5494, name: 'Kuala Lumpur Subang', country: 'MY' },
  PEN: { lat: 5.2971, lon: 100.2768, name: 'Penang', country: 'MY' },
  LGK: { lat: 6.3297, lon: 99.7286, name: 'Langkawi', country: 'MY' },
  BKI: { lat: 5.9372, lon: 116.0514, name: 'Kota Kinabalu', country: 'MY' },
  KCH: { lat: 1.4847, lon: 110.3473, name: 'Kuching', country: 'MY' },
  JHB: { lat: 1.6411, lon: 103.6697, name: 'Johor Bahru Senai', country: 'MY' },
  MYY: { lat: 4.3222, lon: 113.9870, name: 'Miri', country: 'MY' },
  BWN: { lat: 4.9442, lon: 114.9283, name: 'Bandar Seri Begawan', country: 'BN' },
  CGK: { lat: -6.1256, lon: 106.6558, name: 'Jakarta Soekarno-Hatta', country: 'ID' },
  HLP: { lat: -6.2669, lon: 106.8910, name: 'Jakarta Halim', country: 'ID' },
  DPS: { lat: -8.7482, lon: 115.1672, name: 'Bali Ngurah Rai', country: 'ID' },
  SUB: { lat: -7.3798, lon: 112.7868, name: 'Surabaya', country: 'ID' },
  JOG: { lat: -7.7882, lon: 110.4317, name: 'Yogyakarta', country: 'ID' },
  MES: { lat: 3.5580, lon: 98.6711, name: 'Medan Kualanamu', country: 'ID' },
  UPG: { lat: -5.0617, lon: 119.5540, name: 'Makassar', country: 'ID' },
  BPN: { lat: -1.2683, lon: 116.8943, name: 'Balikpapan', country: 'ID' },
  PDG: { lat: -0.8747, lon: 100.3520, name: 'Padang', country: 'ID' },
  PKU: { lat: 0.4607, lon: 101.4447, name: 'Pekanbaru', country: 'ID' },
  PLM: { lat: -2.8983, lon: 104.6999, name: 'Palembang', country: 'ID' },
  BTH: { lat: 1.1212, lon: 104.1186, name: 'Batam', country: 'ID' },
  MNL: { lat: 14.5086, lon: 121.0197, name: 'Manila Ninoy Aquino', country: 'PH' },
  CEB: { lat: 10.3075, lon: 123.9794, name: 'Cebu', country: 'PH' },
  CRK: { lat: 15.1859, lon: 120.5603, name: 'Clark', country: 'PH' },
  DVO: { lat: 7.1255, lon: 125.6456, name: 'Davao', country: 'PH' },
  SGN: { lat: 10.8188, lon: 106.6519, name: 'Ho Chi Minh City', country: 'VN' },
  HAN: { lat: 21.2212, lon: 105.8072, name: 'Hanoi', country: 'VN' },
  DAD: { lat: 16.0439, lon: 108.1994, name: 'Da Nang', country: 'VN' },
  CXR: { lat: 11.9984, lon: 109.2193, name: 'Nha Trang Cam Ranh', country: 'VN' },
  PQC: { lat: 10.1698, lon: 103.9931, name: 'Phu Quoc', country: 'VN' },
  VDO: { lat: 21.1178, lon: 107.4144, name: 'Van Don', country: 'VN' },
  RGN: { lat: 16.9073, lon: 96.1332, name: 'Yangon', country: 'MM' },
  MDL: { lat: 21.7022, lon: 95.9779, name: 'Mandalay', country: 'MM' },
  NYT: { lat: 19.6235, lon: 96.2011, name: 'Naypyidaw', country: 'MM' },
  PNH: { lat: 11.5466, lon: 104.8441, name: 'Phnom Penh', country: 'KH' },
  REP: { lat: 13.4107, lon: 103.8128, name: 'Siem Reap', country: 'KH' },
  VTE: { lat: 17.9883, lon: 102.5633, name: 'Vientiane', country: 'LA' },
  LPQ: { lat: 19.8973, lon: 102.1613, name: 'Luang Prabang', country: 'LA' },
  DIL: { lat: -8.5465, lon: 125.5260, name: 'Dili', country: 'TL' },

  // =====================================================
  // ASIA - SOUTH
  // =====================================================
  DEL: { lat: 28.5562, lon: 77.1000, name: 'Delhi Indira Gandhi', country: 'IN' },
  BOM: { lat: 19.0896, lon: 72.8656, name: 'Mumbai', country: 'IN' },
  MAA: { lat: 12.9941, lon: 80.1709, name: 'Chennai', country: 'IN' },
  BLR: { lat: 13.1986, lon: 77.7066, name: 'Bengaluru', country: 'IN' },
  HYD: { lat: 17.2403, lon: 78.4294, name: 'Hyderabad', country: 'IN' },
  CCU: { lat: 22.6547, lon: 88.4467, name: 'Kolkata', country: 'IN' },
  COK: { lat: 10.1520, lon: 76.4019, name: 'Kochi', country: 'IN' },
  GOI: { lat: 15.3808, lon: 73.8314, name: 'Goa', country: 'IN' },
  AMD: { lat: 23.0772, lon: 72.6347, name: 'Ahmedabad', country: 'IN' },
  TRV: { lat: 8.4821, lon: 76.9201, name: 'Thiruvananthapuram', country: 'IN' },
  JAI: { lat: 26.8242, lon: 75.8122, name: 'Jaipur', country: 'IN' },
  PNQ: { lat: 18.5821, lon: 73.9197, name: 'Pune', country: 'IN' },
  GAU: { lat: 26.1061, lon: 91.5859, name: 'Guwahati', country: 'IN' },
  IXC: { lat: 30.6735, lon: 76.7885, name: 'Chandigarh', country: 'IN' },
  LKO: { lat: 26.7606, lon: 80.8893, name: 'Lucknow', country: 'IN' },
  VNS: { lat: 25.4524, lon: 82.8593, name: 'Varanasi', country: 'IN' },
  CMB: { lat: 7.1808, lon: 79.8841, name: 'Colombo Bandaranaike', country: 'LK' },
  HRI: { lat: 6.2844, lon: 81.1239, name: 'Mattala (Hambantota)', country: 'LK' },
  DAC: { lat: 23.8433, lon: 90.3978, name: 'Dhaka', country: 'BD' },
  CGP: { lat: 22.2496, lon: 91.8133, name: 'Chittagong', country: 'BD' },
  KTM: { lat: 27.6966, lon: 85.3591, name: 'Kathmandu', country: 'NP' },
  ISB: { lat: 33.6167, lon: 73.0991, name: 'Islamabad', country: 'PK' },
  KHI: { lat: 24.9065, lon: 67.1608, name: 'Karachi', country: 'PK' },
  LHE: { lat: 31.5216, lon: 74.4036, name: 'Lahore', country: 'PK' },
  MLE: { lat: 4.1918, lon: 73.5290, name: 'Malé (Maldives)', country: 'MV' },
  PBH: { lat: 27.4033, lon: 89.4246, name: 'Paro (Bhutan)', country: 'BT' },

  // =====================================================
  // OCEANIA - AUSTRALIA
  // =====================================================
  SYD: { lat: -33.9399, lon: 151.1753, name: 'Sydney', country: 'AU' },
  MEL: { lat: -37.6690, lon: 144.8410, name: 'Melbourne', country: 'AU' },
  BNE: { lat: -27.3842, lon: 153.1175, name: 'Brisbane', country: 'AU' },
  PER: { lat: -31.9403, lon: 115.9670, name: 'Perth', country: 'AU' },
  ADL: { lat: -34.9450, lon: 138.5306, name: 'Adelaide', country: 'AU' },
  CBR: { lat: -35.3069, lon: 149.1946, name: 'Canberra', country: 'AU' },
  OOL: { lat: -28.1644, lon: 153.5047, name: 'Gold Coast', country: 'AU' },
  CNS: { lat: -16.8858, lon: 145.7552, name: 'Cairns', country: 'AU' },
  DRW: { lat: -12.4147, lon: 130.8769, name: 'Darwin', country: 'AU' },
  HBA: { lat: -42.8361, lon: 147.5103, name: 'Hobart', country: 'AU' },
  TSV: { lat: -19.2525, lon: 146.7656, name: 'Townsville', country: 'AU' },
  AVV: { lat: -38.0394, lon: 144.4697, name: 'Avalon', country: 'AU' },

  // =====================================================
  // OCEANIA - NEW ZEALAND & PACIFIC
  // =====================================================
  AKL: { lat: -37.0082, lon: 174.7850, name: 'Auckland', country: 'NZ' },
  WLG: { lat: -41.3272, lon: 174.8053, name: 'Wellington', country: 'NZ' },
  CHC: { lat: -43.4894, lon: 172.5322, name: 'Christchurch', country: 'NZ' },
  ZQN: { lat: -45.0211, lon: 168.7392, name: 'Queenstown', country: 'NZ' },
  DUD: { lat: -45.9281, lon: 170.1975, name: 'Dunedin', country: 'NZ' },
  NAN: { lat: -17.7554, lon: 177.4431, name: 'Nadi (Fiji)', country: 'FJ' },
  SUV: { lat: -18.0433, lon: 178.5592, name: 'Suva (Fiji)', country: 'FJ' },
  APW: { lat: -13.8297, lon: -171.9968, name: 'Apia (Samoa)', country: 'WS' },
  TBU: { lat: -21.2411, lon: -175.1497, name: 'Nuku\'alofa (Tonga)', country: 'TO' },
  VLI: { lat: -17.6993, lon: 168.3199, name: 'Port Vila (Vanuatu)', country: 'VU' },
  GUM: { lat: 13.4834, lon: 144.7960, name: 'Guam', country: 'GU' },
  POM: { lat: -5.8624, lon: 147.2200, name: 'Port Moresby', country: 'PG' },

  // =====================================================
  // NORTH AMERICA - USA EAST COAST
  // =====================================================
  JFK: { lat: 40.6398, lon: -73.7789, name: 'New York JFK', country: 'US' },
  EWR: { lat: 40.6925, lon: -74.1687, name: 'Newark Liberty', country: 'US' },
  LGA: { lat: 40.7772, lon: -73.8726, name: 'New York LaGuardia', country: 'US' },
  BOS: { lat: 42.3643, lon: -71.0052, name: 'Boston Logan', country: 'US' },
  PHL: { lat: 39.8719, lon: -75.2411, name: 'Philadelphia', country: 'US' },
  IAD: { lat: 38.9445, lon: -77.4558, name: 'Washington Dulles', country: 'US' },
  DCA: { lat: 38.8521, lon: -77.0377, name: 'Washington Reagan', country: 'US' },
  BWI: { lat: 39.1754, lon: -76.6683, name: 'Baltimore/Washington', country: 'US' },
  PIT: { lat: 40.4915, lon: -80.2329, name: 'Pittsburgh', country: 'US' },
  CLE: { lat: 41.4117, lon: -81.8498, name: 'Cleveland', country: 'US' },
  BUF: { lat: 42.9405, lon: -78.7322, name: 'Buffalo', country: 'US' },
  ROC: { lat: 43.1189, lon: -77.6724, name: 'Rochester', country: 'US' },
  SYR: { lat: 43.1112, lon: -76.1063, name: 'Syracuse', country: 'US' },
  ALB: { lat: 42.7483, lon: -73.8017, name: 'Albany', country: 'US' },
  PVD: { lat: 41.7326, lon: -71.4204, name: 'Providence', country: 'US' },
  BDL: { lat: 41.9389, lon: -72.6832, name: 'Hartford', country: 'US' },
  PWM: { lat: 43.6462, lon: -70.3093, name: 'Portland (Maine)', country: 'US' },
  MHT: { lat: 42.9326, lon: -71.4357, name: 'Manchester', country: 'US' },
  BTV: { lat: 44.4720, lon: -73.1533, name: 'Burlington', country: 'US' },

  // =====================================================
  // NORTH AMERICA - USA SOUTHEAST
  // =====================================================
  ATL: { lat: 33.6367, lon: -84.4281, name: 'Atlanta Hartsfield-Jackson', country: 'US' },
  CLT: { lat: 35.2140, lon: -80.9431, name: 'Charlotte', country: 'US' },
  MIA: { lat: 25.7932, lon: -80.2906, name: 'Miami', country: 'US' },
  FLL: { lat: 26.0726, lon: -80.1527, name: 'Fort Lauderdale', country: 'US' },
  MCO: { lat: 28.4294, lon: -81.3090, name: 'Orlando', country: 'US' },
  TPA: { lat: 27.9755, lon: -82.5332, name: 'Tampa', country: 'US' },
  RSW: { lat: 26.5362, lon: -81.7552, name: 'Fort Myers', country: 'US' },
  PBI: { lat: 26.6832, lon: -80.0956, name: 'West Palm Beach', country: 'US' },
  JAX: { lat: 30.4941, lon: -81.6879, name: 'Jacksonville', country: 'US' },
  RDU: { lat: 35.8801, lon: -78.7880, name: 'Raleigh-Durham', country: 'US' },
  GSP: { lat: 34.8957, lon: -82.2189, name: 'Greenville-Spartanburg', country: 'US' },
  CHS: { lat: 32.8986, lon: -80.0405, name: 'Charleston', country: 'US' },
  SAV: { lat: 32.1276, lon: -81.2021, name: 'Savannah', country: 'US' },
  MYR: { lat: 33.6797, lon: -78.9283, name: 'Myrtle Beach', country: 'US' },
  BNA: { lat: 36.1263, lon: -86.6774, name: 'Nashville', country: 'US' },
  MEM: { lat: 35.0424, lon: -89.9767, name: 'Memphis', country: 'US' },
  MSY: { lat: 29.9934, lon: -90.2580, name: 'New Orleans', country: 'US' },
  SDF: { lat: 38.1744, lon: -85.7360, name: 'Louisville', country: 'US' },
  CVG: { lat: 39.0489, lon: -84.6678, name: 'Cincinnati', country: 'US' },
  CMH: { lat: 39.9980, lon: -82.8919, name: 'Columbus', country: 'US' },
  IND: { lat: 39.7173, lon: -86.2944, name: 'Indianapolis', country: 'US' },
  BHM: { lat: 33.5629, lon: -86.7535, name: 'Birmingham', country: 'US' },

  // =====================================================
  // NORTH AMERICA - USA MIDWEST
  // =====================================================
  ORD: { lat: 41.9786, lon: -87.9048, name: 'Chicago O\'Hare', country: 'US' },
  MDW: { lat: 41.7868, lon: -87.7522, name: 'Chicago Midway', country: 'US' },
  DTW: { lat: 42.2124, lon: -83.3534, name: 'Detroit', country: 'US' },
  MSP: { lat: 44.8820, lon: -93.2218, name: 'Minneapolis-St. Paul', country: 'US' },
  STL: { lat: 38.7487, lon: -90.3700, name: 'St. Louis', country: 'US' },
  MCI: { lat: 39.2976, lon: -94.7139, name: 'Kansas City', country: 'US' },
  MKE: { lat: 42.9472, lon: -87.8966, name: 'Milwaukee', country: 'US' },
  OMA: { lat: 41.3032, lon: -95.8941, name: 'Omaha', country: 'US' },
  DSM: { lat: 41.5340, lon: -93.6631, name: 'Des Moines', country: 'US' },
  FAR: { lat: 46.9207, lon: -96.8158, name: 'Fargo', country: 'US' },
  FSD: { lat: 43.5820, lon: -96.7419, name: 'Sioux Falls', country: 'US' },
  GRR: { lat: 42.8808, lon: -85.5228, name: 'Grand Rapids', country: 'US' },
  LAN: { lat: 42.7787, lon: -84.5874, name: 'Lansing', country: 'US' },
  FNT: { lat: 42.9654, lon: -83.7436, name: 'Flint', country: 'US' },
  TVC: { lat: 44.7412, lon: -85.5821, name: 'Traverse City', country: 'US' },
  CID: { lat: 41.8847, lon: -91.7108, name: 'Cedar Rapids', country: 'US' },
  ICT: { lat: 37.6499, lon: -97.4331, name: 'Wichita', country: 'US' },

  // =====================================================
  // NORTH AMERICA - USA SOUTHWEST & TEXAS
  // =====================================================
  DFW: { lat: 32.8968, lon: -97.0380, name: 'Dallas/Fort Worth', country: 'US' },
  DAL: { lat: 32.8471, lon: -96.8518, name: 'Dallas Love Field', country: 'US' },
  IAH: { lat: 29.9844, lon: -95.3414, name: 'Houston Intercontinental', country: 'US' },
  HOU: { lat: 29.6454, lon: -95.2789, name: 'Houston Hobby', country: 'US' },
  AUS: { lat: 30.1945, lon: -97.6699, name: 'Austin', country: 'US' },
  SAT: { lat: 29.5337, lon: -98.4698, name: 'San Antonio', country: 'US' },
  ELP: { lat: 31.8072, lon: -106.3778, name: 'El Paso', country: 'US' },
  PHX: { lat: 33.4373, lon: -112.0078, name: 'Phoenix', country: 'US' },
  TUS: { lat: 32.1161, lon: -110.9410, name: 'Tucson', country: 'US' },
  ABQ: { lat: 35.0402, lon: -106.6094, name: 'Albuquerque', country: 'US' },
  LAS: { lat: 36.0801, lon: -115.1522, name: 'Las Vegas', country: 'US' },
  DEN: { lat: 39.8561, lon: -104.6737, name: 'Denver', country: 'US' },
  SLC: { lat: 40.7884, lon: -111.9778, name: 'Salt Lake City', country: 'US' },
  OKC: { lat: 35.3931, lon: -97.6007, name: 'Oklahoma City', country: 'US' },
  TUL: { lat: 36.1984, lon: -95.8881, name: 'Tulsa', country: 'US' },
  COS: { lat: 38.8058, lon: -104.7008, name: 'Colorado Springs', country: 'US' },
  BOI: { lat: 43.5644, lon: -116.2228, name: 'Boise', country: 'US' },

  // =====================================================
  // NORTH AMERICA - USA WEST COAST
  // =====================================================
  LAX: { lat: 33.9425, lon: -118.4081, name: 'Los Angeles', country: 'US' },
  SFO: { lat: 37.6188, lon: -122.3754, name: 'San Francisco', country: 'US' },
  SJC: { lat: 37.3626, lon: -121.9291, name: 'San Jose', country: 'US' },
  OAK: { lat: 37.7126, lon: -122.2197, name: 'Oakland', country: 'US' },
  SAN: { lat: 32.7336, lon: -117.1897, name: 'San Diego', country: 'US' },
  SEA: { lat: 47.4502, lon: -122.3088, name: 'Seattle-Tacoma', country: 'US' },
  PDX: { lat: 45.5898, lon: -122.5951, name: 'Portland', country: 'US' },
  SMF: { lat: 38.6954, lon: -121.5908, name: 'Sacramento', country: 'US' },
  SNA: { lat: 33.6757, lon: -117.8682, name: 'Orange County (John Wayne)', country: 'US' },
  ONT: { lat: 34.0559, lon: -117.6011, name: 'Ontario', country: 'US' },
  BUR: { lat: 34.2007, lon: -118.3585, name: 'Burbank', country: 'US' },
  LGB: { lat: 33.8177, lon: -118.1516, name: 'Long Beach', country: 'US' },
  PSP: { lat: 33.8297, lon: -116.5067, name: 'Palm Springs', country: 'US' },
  RNO: { lat: 39.4991, lon: -119.7681, name: 'Reno', country: 'US' },
  FAT: { lat: 36.7762, lon: -119.7181, name: 'Fresno', country: 'US' },
  SBA: { lat: 34.4262, lon: -119.8403, name: 'Santa Barbara', country: 'US' },
  GEG: { lat: 47.6199, lon: -117.5338, name: 'Spokane', country: 'US' },

  // =====================================================
  // NORTH AMERICA - USA HAWAII & ALASKA
  // =====================================================
  HNL: { lat: 21.3187, lon: -157.9225, name: 'Honolulu', country: 'US' },
  OGG: { lat: 20.8986, lon: -156.4305, name: 'Maui Kahului', country: 'US' },
  KOA: { lat: 19.7388, lon: -156.0456, name: 'Kona', country: 'US' },
  LIH: { lat: 21.9760, lon: -159.3390, name: 'Kauai Lihue', country: 'US' },
  ITO: { lat: 19.7214, lon: -155.0485, name: 'Hilo', country: 'US' },
  ANC: { lat: 61.1744, lon: -149.9964, name: 'Anchorage', country: 'US' },
  FAI: { lat: 64.8151, lon: -147.8561, name: 'Fairbanks', country: 'US' },
  JNU: { lat: 58.3550, lon: -134.5763, name: 'Juneau', country: 'US' },

  // =====================================================
  // NORTH AMERICA - CANADA
  // =====================================================
  YYZ: { lat: 43.6777, lon: -79.6248, name: 'Toronto Pearson', country: 'CA' },
  YYC: { lat: 51.1215, lon: -114.0076, name: 'Calgary', country: 'CA' },
  YVR: { lat: 49.1967, lon: -123.1815, name: 'Vancouver', country: 'CA' },
  YUL: { lat: 45.4706, lon: -73.7408, name: 'Montréal Trudeau', country: 'CA' },
  YOW: { lat: 45.3225, lon: -75.6692, name: 'Ottawa', country: 'CA' },
  YEG: { lat: 53.3097, lon: -113.5800, name: 'Edmonton', country: 'CA' },
  YWG: { lat: 49.9100, lon: -97.2399, name: 'Winnipeg', country: 'CA' },
  YHZ: { lat: 44.8808, lon: -63.5086, name: 'Halifax', country: 'CA' },
  YQB: { lat: 46.7911, lon: -71.3933, name: 'Québec City', country: 'CA' },
  YXE: { lat: 52.1708, lon: -106.6997, name: 'Saskatoon', country: 'CA' },
  YQR: { lat: 50.4319, lon: -104.6656, name: 'Regina', country: 'CA' },
  YYJ: { lat: 48.6469, lon: -123.4258, name: 'Victoria', country: 'CA' },
  YKA: { lat: 50.7022, lon: -120.4444, name: 'Kamloops', country: 'CA' },
  YLW: { lat: 49.9561, lon: -119.3778, name: 'Kelowna', country: 'CA' },
  YXX: { lat: 49.0253, lon: -122.3608, name: 'Abbotsford', country: 'CA' },
  YQT: { lat: 48.3719, lon: -89.3239, name: 'Thunder Bay', country: 'CA' },
  YSB: { lat: 46.6250, lon: -80.7989, name: 'Sudbury', country: 'CA' },
  YQM: { lat: 46.1122, lon: -64.6786, name: 'Moncton', country: 'CA' },
  YYT: { lat: 47.6186, lon: -52.7519, name: 'St. John\'s', country: 'CA' },
  YZF: { lat: 62.4628, lon: -114.4403, name: 'Yellowknife', country: 'CA' },
  YXY: { lat: 60.7096, lon: -135.0672, name: 'Whitehorse', country: 'CA' },

  // =====================================================
  // NORTH AMERICA - MEXICO
  // =====================================================
  MEX: { lat: 19.4363, lon: -99.0721, name: 'Mexico City', country: 'MX' },
  CUN: { lat: 21.0365, lon: -86.8771, name: 'Cancún', country: 'MX' },
  GDL: { lat: 20.5218, lon: -103.3111, name: 'Guadalajara', country: 'MX' },
  MTY: { lat: 25.7785, lon: -100.1069, name: 'Monterrey', country: 'MX' },
  TIJ: { lat: 32.5411, lon: -116.9700, name: 'Tijuana', country: 'MX' },
  SJD: { lat: 23.1518, lon: -109.7215, name: 'San José del Cabo', country: 'MX' },
  PVR: { lat: 20.6801, lon: -105.2543, name: 'Puerto Vallarta', country: 'MX' },
  MID: { lat: 20.9370, lon: -89.6577, name: 'Mérida', country: 'MX' },
  ACA: { lat: 16.7571, lon: -99.7539, name: 'Acapulco', country: 'MX' },
  CZM: { lat: 20.5224, lon: -86.9256, name: 'Cozumel', country: 'MX' },
  ZIH: { lat: 17.6017, lon: -101.4606, name: 'Ixtapa/Zihuatanejo', country: 'MX' },
  HMO: { lat: 29.0959, lon: -111.0478, name: 'Hermosillo', country: 'MX' },
  BJX: { lat: 20.9935, lon: -101.4808, name: 'León/Guanajuato', country: 'MX' },
  CUL: { lat: 24.7645, lon: -107.4752, name: 'Culiacán', country: 'MX' },
  QRO: { lat: 20.6173, lon: -100.1858, name: 'Querétaro', country: 'MX' },
  VER: { lat: 19.1459, lon: -96.1873, name: 'Veracruz', country: 'MX' },
  OAX: { lat: 16.9999, lon: -96.7266, name: 'Oaxaca', country: 'MX' },

  // =====================================================
  // CARIBBEAN
  // =====================================================
  NAS: { lat: 25.0390, lon: -77.4662, name: 'Nassau (Bahamas)', country: 'BS' },
  FPO: { lat: 26.5587, lon: -78.6956, name: 'Freeport (Bahamas)', country: 'BS' },
  HAV: { lat: 22.9892, lon: -82.4091, name: 'Havana', country: 'CU' },
  VRA: { lat: 23.0344, lon: -81.4353, name: 'Varadero', country: 'CU' },
  MBJ: { lat: 18.5037, lon: -77.9134, name: 'Montego Bay', country: 'JM' },
  KIN: { lat: 17.9357, lon: -76.7875, name: 'Kingston', country: 'JM' },
  SDQ: { lat: 18.4297, lon: -69.6689, name: 'Santo Domingo', country: 'DO' },
  PUJ: { lat: 18.5674, lon: -68.3634, name: 'Punta Cana', country: 'DO' },
  STI: { lat: 19.4061, lon: -70.6047, name: 'Santiago (DR)', country: 'DO' },
  SJU: { lat: 18.4394, lon: -66.0018, name: 'San Juan', country: 'PR' },
  AUA: { lat: 12.5014, lon: -70.0152, name: 'Aruba', country: 'AW' },
  CUR: { lat: 12.1889, lon: -68.9598, name: 'Curaçao', country: 'CW' },
  BON: { lat: 12.1310, lon: -68.2685, name: 'Bonaire', country: 'BQ' },
  SXM: { lat: 18.0410, lon: -63.1089, name: 'St. Maarten', country: 'SX' },
  ANU: { lat: 17.1367, lon: -61.7926, name: 'Antigua', country: 'AG' },
  BGI: { lat: 13.0746, lon: -59.4925, name: 'Barbados', country: 'BB' },
  POS: { lat: 10.5954, lon: -61.3372, name: 'Port of Spain (Trinidad)', country: 'TT' },
  TAB: { lat: 11.1500, lon: -60.8320, name: 'Tobago', country: 'TT' },
  GND: { lat: 12.0042, lon: -61.7862, name: 'Grenada', country: 'GD' },
  UVF: { lat: 13.7332, lon: -60.9526, name: 'St. Lucia', country: 'LC' },
  SVD: { lat: 13.1443, lon: -61.2108, name: 'St. Vincent', country: 'VC' },
  SKB: { lat: 17.3112, lon: -62.7187, name: 'St. Kitts', country: 'KN' },
  DOM: { lat: 15.5470, lon: -61.3000, name: 'Dominica', country: 'DM' },
  EIS: { lat: 18.4448, lon: -64.5428, name: 'Tortola (BVI)', country: 'VG' },
  STT: { lat: 18.3373, lon: -64.9734, name: 'St. Thomas (USVI)', country: 'VI' },
  STX: { lat: 17.7019, lon: -64.7986, name: 'St. Croix (USVI)', country: 'VI' },
  GCM: { lat: 19.2928, lon: -81.3577, name: 'Grand Cayman', country: 'KY' },
  BDA: { lat: 32.3640, lon: -64.6787, name: 'Bermuda', country: 'BM' },

  // =====================================================
  // CENTRAL AMERICA
  // =====================================================
  GUA: { lat: 14.5833, lon: -90.5275, name: 'Guatemala City', country: 'GT' },
  SAL: { lat: 13.4409, lon: -89.0557, name: 'San Salvador', country: 'SV' },
  TGU: { lat: 14.0608, lon: -87.2172, name: 'Tegucigalpa', country: 'HN' },
  SAP: { lat: 15.4526, lon: -87.9236, name: 'San Pedro Sula', country: 'HN' },
  RTB: { lat: 16.3168, lon: -86.5230, name: 'Roatán', country: 'HN' },
  MGA: { lat: 12.1415, lon: -86.1682, name: 'Managua', country: 'NI' },
  SJO: { lat: 9.9939, lon: -84.2088, name: 'San José (Costa Rica)', country: 'CR' },
  LIR: { lat: 10.5933, lon: -85.5444, name: 'Liberia (Costa Rica)', country: 'CR' },
  PTY: { lat: 9.0714, lon: -79.3835, name: 'Panama City Tocumen', country: 'PA' },
  BZE: { lat: 17.5391, lon: -88.3082, name: 'Belize City', country: 'BZ' },

  // =====================================================
  // SOUTH AMERICA
  // =====================================================
  GRU: { lat: -23.4356, lon: -46.4731, name: 'São Paulo Guarulhos', country: 'BR' },
  CGH: { lat: -23.6261, lon: -46.6564, name: 'São Paulo Congonhas', country: 'BR' },
  GIG: { lat: -22.8100, lon: -43.2505, name: 'Rio de Janeiro Galeão', country: 'BR' },
  SDU: { lat: -22.9105, lon: -43.1631, name: 'Rio de Janeiro Santos Dumont', country: 'BR' },
  BSB: { lat: -15.8711, lon: -47.9186, name: 'Brasília', country: 'BR' },
  CNF: { lat: -19.6244, lon: -43.9719, name: 'Belo Horizonte', country: 'BR' },
  SSA: { lat: -12.9086, lon: -38.3225, name: 'Salvador', country: 'BR' },
  REC: { lat: -8.1265, lon: -34.9236, name: 'Recife', country: 'BR' },
  FOR: { lat: -3.7763, lon: -38.5323, name: 'Fortaleza', country: 'BR' },
  POA: { lat: -29.9944, lon: -51.1714, name: 'Porto Alegre', country: 'BR' },
  CWB: { lat: -25.5285, lon: -49.1758, name: 'Curitiba', country: 'BR' },
  FLN: { lat: -27.6703, lon: -48.5525, name: 'Florianópolis', country: 'BR' },
  NAT: { lat: -5.7681, lon: -35.3761, name: 'Natal', country: 'BR' },
  MAO: { lat: -3.0386, lon: -60.0497, name: 'Manaus', country: 'BR' },
  BEL: { lat: -1.3792, lon: -48.4764, name: 'Belém', country: 'BR' },
  VCP: { lat: -23.0074, lon: -47.1345, name: 'Campinas', country: 'BR' },
  IGU: { lat: -25.5961, lon: -54.4897, name: 'Foz do Iguaçu', country: 'BR' },
  EZE: { lat: -34.8222, lon: -58.5358, name: 'Buenos Aires Ezeiza', country: 'AR' },
  AEP: { lat: -34.5592, lon: -58.4156, name: 'Buenos Aires Aeroparque', country: 'AR' },
  COR: { lat: -31.3236, lon: -64.2081, name: 'Córdoba', country: 'AR' },
  MDZ: { lat: -32.8317, lon: -68.7928, name: 'Mendoza', country: 'AR' },
  BRC: { lat: -41.1512, lon: -71.1575, name: 'Bariloche', country: 'AR' },
  IGR: { lat: -25.7373, lon: -54.4734, name: 'Iguazú', country: 'AR' },
  USH: { lat: -54.8433, lon: -68.2956, name: 'Ushuaia', country: 'AR' },
  FTE: { lat: -50.2803, lon: -72.0531, name: 'El Calafate', country: 'AR' },
  SCL: { lat: -33.3930, lon: -70.7858, name: 'Santiago', country: 'CL' },
  IQQ: { lat: -20.5352, lon: -70.1813, name: 'Iquique', country: 'CL' },
  ANF: { lat: -23.4445, lon: -70.4450, name: 'Antofagasta', country: 'CL' },
  CCP: { lat: -36.7727, lon: -73.0631, name: 'Concepción', country: 'CL' },
  PUQ: { lat: -53.0026, lon: -70.8546, name: 'Punta Arenas', country: 'CL' },
  IPC: { lat: -27.1648, lon: -109.4219, name: 'Easter Island', country: 'CL' },
  BOG: { lat: 4.7016, lon: -74.1469, name: 'Bogotá', country: 'CO' },
  MDE: { lat: 6.1645, lon: -75.4231, name: 'Medellín', country: 'CO' },
  CLO: { lat: 3.5432, lon: -76.3816, name: 'Cali', country: 'CO' },
  CTG: { lat: 10.4424, lon: -75.5130, name: 'Cartagena', country: 'CO' },
  BAQ: { lat: 10.8896, lon: -74.7808, name: 'Barranquilla', country: 'CO' },
  SMR: { lat: 11.1196, lon: -74.2306, name: 'Santa Marta', country: 'CO' },
  ADZ: { lat: 12.5836, lon: -81.7112, name: 'San Andrés', country: 'CO' },
  LIM: { lat: -12.0219, lon: -77.1143, name: 'Lima', country: 'PE' },
  CUZ: { lat: -13.5357, lon: -71.9388, name: 'Cusco', country: 'PE' },
  AQP: { lat: -16.3411, lon: -71.5830, name: 'Arequipa', country: 'PE' },
  UIO: { lat: -0.1292, lon: -78.3575, name: 'Quito', country: 'EC' },
  GYE: { lat: -2.1574, lon: -79.8837, name: 'Guayaquil', country: 'EC' },
  GPS: { lat: -0.4537, lon: -90.2659, name: 'Galápagos', country: 'EC' },
  CCS: { lat: 10.6012, lon: -66.9913, name: 'Caracas', country: 'VE' },
  VVI: { lat: -17.6448, lon: -63.1354, name: 'Santa Cruz (Bolivia)', country: 'BO' },
  LPB: { lat: -16.5133, lon: -68.1923, name: 'La Paz', country: 'BO' },
  ASU: { lat: -25.2400, lon: -57.5200, name: 'Asunción', country: 'PY' },
  MVD: { lat: -34.8384, lon: -56.0308, name: 'Montevideo', country: 'UY' },
  PBM: { lat: 5.4528, lon: -55.1878, name: 'Paramaribo', country: 'SR' },
  GEO: { lat: 6.4985, lon: -58.2541, name: 'Georgetown', country: 'GY' },
};

// 3. Distance calculation (Haversine formula)

export const calculateDistance = (from: string, to: string): number => {
  const a1 = AIRPORTS[from];
  const a2 = AIRPORTS[to];

  if (!a1 || !a2) {
    console.warn(`Missing airport data for: ${from} or ${to}`);
    return 0;
  }

  const R = 3959; // Earth radius in miles
  const lat1 = (a1.lat * Math.PI) / 180;
  const lat2 = (a2.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((a2.lon - a1.lon) * Math.PI) / 180;

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

// 7. Helper to get all airport codes (useful for autocomplete)
export const getAllAirportCodes = (): string[] => {
  return Object.keys(AIRPORTS).sort();
};

// 8. Search airports by code or name
export const searchAirports = (query: string): Array<{ code: string; info: AirportInfo }> => {
  const q = query.toUpperCase().trim();
  if (!q) return [];
  
  return Object.entries(AIRPORTS)
    .filter(([code, info]) => 
      code.includes(q) || 
      info.name.toUpperCase().includes(q) ||
      info.country.includes(q)
    )
    .map(([code, info]) => ({ code, info }))
    .slice(0, 20); // Limit results
};
