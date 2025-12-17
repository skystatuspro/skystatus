/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  PROTECTED MODULE - DO NOT MODIFY WITHOUT AUTHORIZATION  ⚠️           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  This module handles critical PDF import logic. Unauthorized changes      ║
 * ║  can cause DATA LOSS for users.                                          ║
 * ║                                                                           ║
 * ║  BEFORE MAKING ANY CHANGES:                                              ║
 * ║  1. Read README.md in this directory                                     ║
 * ║  2. Run ALL tests: npm run test:pdf-import                               ║
 * ║  3. Update CHANGELOG.md with your changes                                ║
 * ║  4. Update VERSION if needed (semver)                                    ║
 * ║  5. Test with real PDFs in multiple languages                            ║
 * ║                                                                           ║
 * ║  Module Version: 2.0.0                                                   ║
 * ║  Last Modified: 2024-12-17                                               ║
 * ║  Last Author: Claude                                                      ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Transaction Patterns
 * 
 * Multi-language patterns for identifying transaction types in PDFs.
 * Used to categorize miles and XP sources.
 * 
 * @module locales/transaction-patterns
 */

import type { SupportedLanguage } from '../types';

/**
 * Transaction type categories
 */
export type TransactionCategory = 
  | 'earned'
  | 'debit'
  | 'requalification'
  | 'flight'
  | 'creditCard'
  | 'hotel'
  | 'subscription'
  | 'transfer'
  | 'promo'
  | 'purchase'
  | 'saf'
  | 'firstFlight';

/**
 * Patterns for each transaction category by language
 */
export const TRANSACTION_PATTERNS: Record<TransactionCategory, Record<SupportedLanguage, string[]>> = {
  earned: {
    en: ['earned', 'received', 'awarded', 'credited', 'gained'],
    nl: ['gespaarde', 'gespaard', 'ontvangen', 'verdiend', 'bijgeschreven'],
    fr: ['acquis', 'reçu', 'crédité', 'gagné', 'obtenu'],
    de: ['gesammelt', 'erhalten', 'gutgeschrieben', 'verdient'],
    es: ['ganado', 'recibido', 'acreditado', 'obtenido'],
    pt: ['ganhos', 'recebido', 'creditado', 'obtido'],
    it: ['guadagnati', 'ricevuto', 'accreditato', 'ottenuto'],
  },
  
  debit: {
    en: ['debit', 'spent', 'used', 'redeemed', 'debited'],
    nl: ['uitgegeven', 'gebruikt', 'ingewisseld', 'afgeschreven'],
    fr: ['dépensé', 'utilisé', 'échangé', 'débité'],
    de: ['ausgegeben', 'verwendet', 'eingelöst', 'abgebucht'],
    es: ['gastado', 'usado', 'canjeado', 'debitado'],
    pt: ['gasto', 'usado', 'resgatado', 'debitado'],
    it: ['speso', 'usato', 'riscattato', 'addebitato'],
  },
  
  requalification: {
    en: ['requalification', 'requalified', 'renewed', 'status renewed', 'level renewed'],
    nl: ['hernieuwing', 'hernieuwd', 'herkwalificatie', 'status hernieuwd'],
    fr: ['requalification', 'requalifié', 'renouvelé', 'statut renouvelé'],
    de: ['requalifizierung', 'requalifiziert', 'erneuert', 'status erneuert'],
    es: ['recalificación', 'recalificado', 'renovado', 'estado renovado'],
    pt: ['requalificação', 'requalificado', 'renovado', 'status renovado'],
    it: ['riqualificazione', 'riqualificato', 'rinnovato', 'stato rinnovato'],
  },
  
  flight: {
    en: ['flight', 'fly', 'flying', 'trip'],
    nl: ['vlucht', 'vliegen', 'reis'],
    fr: ['vol', 'voler', 'voyage'],
    de: ['flug', 'fliegen', 'reise'],
    es: ['vuelo', 'volar', 'viaje'],
    pt: ['voo', 'voar', 'viagem'],
    it: ['volo', 'volare', 'viaggio'],
  },
  
  creditCard: {
    en: ['credit card', 'card spending', 'amex', 'american express', 'mastercard', 'visa'],
    nl: ['creditcard', 'kaartuitgaven', 'amex', 'american express'],
    fr: ['carte de crédit', 'dépenses carte', 'amex', 'american express'],
    de: ['kreditkarte', 'kartenausgaben', 'amex', 'american express'],
    es: ['tarjeta de crédito', 'gastos tarjeta', 'amex', 'american express'],
    pt: ['cartão de crédito', 'gastos cartão', 'amex', 'american express'],
    it: ['carta di credito', 'spese carta', 'amex', 'american express'],
  },
  
  hotel: {
    en: ['hotel', 'accommodation', 'accor', 'all-accor', 'marriott', 'stay'],
    nl: ['hotel', 'verblijf', 'accor', 'all-accor', 'accommodatie'],
    fr: ['hôtel', 'hébergement', 'accor', 'all-accor', 'séjour'],
    de: ['hotel', 'unterkunft', 'accor', 'all-accor', 'aufenthalt'],
    es: ['hotel', 'alojamiento', 'accor', 'all-accor', 'estancia'],
    pt: ['hotel', 'hospedagem', 'accor', 'all-accor', 'estadia'],
    it: ['hotel', 'alloggio', 'accor', 'all-accor', 'soggiorno'],
  },
  
  subscription: {
    en: ['subscription', 'flying blue+', 'fb+', 'membership'],
    nl: ['abonnement', 'flying blue+', 'fb+', 'lidmaatschap'],
    fr: ['abonnement', 'flying blue+', 'fb+', 'adhésion'],
    de: ['abonnement', 'flying blue+', 'fb+', 'mitgliedschaft'],
    es: ['suscripción', 'flying blue+', 'fb+', 'membresía'],
    pt: ['assinatura', 'flying blue+', 'fb+', 'associação'],
    it: ['abbonamento', 'flying blue+', 'fb+', 'iscrizione'],
  },
  
  transfer: {
    en: ['transfer', 'transferred', 'points transfer', 'partner transfer'],
    nl: ['overdracht', 'overgemaakt', 'punten overdracht'],
    fr: ['transfert', 'transféré', 'transfert de points'],
    de: ['übertragung', 'übertragen', 'punkteübertragung'],
    es: ['transferencia', 'transferido', 'transferencia de puntos'],
    pt: ['transferência', 'transferido', 'transferência de pontos'],
    it: ['trasferimento', 'trasferito', 'trasferimento punti'],
  },
  
  promo: {
    en: ['promo', 'promotion', 'bonus', 'offer', 'special offer', 'campaign'],
    nl: ['promo', 'promotie', 'bonus', 'aanbieding', 'actie', 'campagne'],
    fr: ['promo', 'promotion', 'bonus', 'offre', 'offre spéciale'],
    de: ['promo', 'aktion', 'bonus', 'angebot', 'sonderangebot'],
    es: ['promo', 'promoción', 'bonus', 'oferta', 'oferta especial'],
    pt: ['promo', 'promoção', 'bônus', 'oferta', 'oferta especial'],
    it: ['promo', 'promozione', 'bonus', 'offerta', 'offerta speciale'],
  },
  
  purchase: {
    en: ['purchase', 'bought', 'buy', 'purchased miles'],
    nl: ['aankoop', 'gekocht', 'kopen', 'gekochte miles'],
    fr: ['achat', 'acheté', 'acheter', 'miles achetés'],
    de: ['kauf', 'gekauft', 'kaufen', 'gekaufte meilen'],
    es: ['compra', 'comprado', 'comprar', 'millas compradas'],
    pt: ['compra', 'comprado', 'comprar', 'milhas compradas'],
    it: ['acquisto', 'acquistato', 'acquistare', 'miglia acquistate'],
  },
  
  saf: {
    en: ['saf', 'sustainable', 'sustainable aviation fuel', 'saf contribution'],
    nl: ['saf', 'duurzaam', 'duurzame vliegtuigbrandstof', 'saf bijdrage'],
    fr: ['saf', 'durable', 'carburant aviation durable', 'contribution saf'],
    de: ['saf', 'nachhaltig', 'nachhaltiger flugkraftstoff', 'saf beitrag'],
    es: ['saf', 'sostenible', 'combustible aviación sostenible'],
    pt: ['saf', 'sustentável', 'combustível aviação sustentável'],
    it: ['saf', 'sostenibile', 'carburante aviazione sostenibile'],
  },
  
  firstFlight: {
    en: ['first flight', 'welcome', 'welcome bonus', 'new member'],
    nl: ['eerste vlucht', 'welkom', 'welkomstbonus', 'nieuw lid'],
    fr: ['premier vol', 'bienvenue', 'bonus bienvenue', 'nouveau membre'],
    de: ['erster flug', 'willkommen', 'willkommensbonus', 'neues mitglied'],
    es: ['primer vuelo', 'bienvenido', 'bono bienvenida', 'nuevo miembro'],
    pt: ['primeiro voo', 'bem-vindo', 'bônus boas-vindas', 'novo membro'],
    it: ['primo volo', 'benvenuto', 'bonus benvenuto', 'nuovo membro'],
  },
};

/**
 * Detect transaction category from text
 * 
 * @param text - Text to analyze
 * @param language - Optional language hint (searches all if not provided)
 * @returns Detected category or null
 */
export function detectTransactionCategory(
  text: string,
  language?: SupportedLanguage
): TransactionCategory | null {
  const lowerText = text.toLowerCase();
  
  const languages = language ? [language] : ['en', 'nl', 'fr', 'de', 'es', 'pt', 'it'] as SupportedLanguage[];
  
  for (const category of Object.keys(TRANSACTION_PATTERNS) as TransactionCategory[]) {
    for (const lang of languages) {
      const patterns = TRANSACTION_PATTERNS[category][lang];
      for (const pattern of patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          return category;
        }
      }
    }
  }
  
  return null;
}

/**
 * Check if text indicates an earned (credit) transaction
 */
export function isEarnedTransaction(text: string, language?: SupportedLanguage): boolean {
  const category = detectTransactionCategory(text, language);
  return category !== 'debit' && category !== null;
}

/**
 * Check if text indicates a debit (spent) transaction
 */
export function isDebitTransaction(text: string, language?: SupportedLanguage): boolean {
  return detectTransactionCategory(text, language) === 'debit';
}

/**
 * Get all patterns for a category across all languages
 */
export function getAllPatternsForCategory(category: TransactionCategory): string[] {
  const patterns: string[] = [];
  for (const lang of Object.keys(TRANSACTION_PATTERNS[category]) as SupportedLanguage[]) {
    patterns.push(...TRANSACTION_PATTERNS[category][lang]);
  }
  return [...new Set(patterns)]; // Remove duplicates
}
