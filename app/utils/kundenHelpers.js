/**
 * Gibt Kunden-Namen zurück (aus DB oder Legacy)
 * @param {Object} reparatur - Reparatur-Objekt
 * @returns {string|null} - Kunden-Name oder null
 */
export function getKundenName(reparatur) {
  // Priorität 1: Kunde aus Datenbank
  if (reparatur.kunde) {
    return `${reparatur.kunde.vorname || ''} ${reparatur.kunde.nachname || ''}`.trim()
  }
  
  // Priorität 2: Legacy-Freitext
  if (reparatur.kunde_name_legacy) {
    return reparatur.kunde_name_legacy
  }
  
  // Fallback: Altes kunde_name Feld (für Kompatibilität)
  if (reparatur.kunde_name) {
    return reparatur.kunde_name
  }
  
  return null
}

/**
 * Gibt Kunden-Telefon zurück (aus DB oder Legacy)
 * @param {Object} reparatur - Reparatur-Objekt
 * @returns {string|null} - Telefonnummer oder null
 */
export function getKundenTelefon(reparatur) {
  if (reparatur.kunde?.telefon) {
    return reparatur.kunde.telefon
  }
  
  if (reparatur.kunde_telefon_legacy) {
    return reparatur.kunde_telefon_legacy
  }
  
  if (reparatur.kunde_telefon) {
    return reparatur.kunde_telefon
  }
  
  return null
}

/**
 * Gibt Kundennummer zurück (nur bei DB-Kunden)
 * @param {Object} reparatur - Reparatur-Objekt
 * @returns {string|null} - Kundennummer oder null
 */
export function getKundennummer(reparatur) {
  return reparatur.kunde?.kundennummer || null
}

/**
 * Prüft ob Kunde aus Datenbank stammt
 * @param {Object} reparatur - Reparatur-Objekt
 * @returns {boolean} - true wenn aus DB
 */
export function hasDBKunde(reparatur) {
  return !!reparatur.kunde_id && !!reparatur.kunde
}
