-- Migration: Fehlende Spalten zu reparaturen Tabelle hinzufügen
-- Datum: 2025-02-02
-- Beschreibung: Fügt die neuen Workflow-Tracking Felder hinzu

-- 1. begonnen_am Spalte hinzufügen (falls nicht vorhanden)
ALTER TABLE reparaturen 
ADD COLUMN IF NOT EXISTS begonnen_am TIMESTAMP;

-- 2. prioritaet Spalte hinzufügen (falls nicht vorhanden)
ALTER TABLE reparaturen 
ADD COLUMN IF NOT EXISTS prioritaet INTEGER DEFAULT 3;

-- 3. meister_zugewiesen Spalte hinzufügen (falls nicht vorhanden)
ALTER TABLE reparaturen 
ADD COLUMN IF NOT EXISTS meister_zugewiesen VARCHAR(100);

-- Kommentar: Diese Felder sind Teil des erweiterten Workflow-Trackings
COMMENT ON COLUMN reparaturen.begonnen_am IS 'Zeitpunkt, wann mit der Reparatur begonnen wurde';
COMMENT ON COLUMN reparaturen.prioritaet IS 'Priorität: 1=sehr dringend, 5=normal';
COMMENT ON COLUMN reparaturen.meister_zugewiesen IS 'Name des zugewiesenen Meisters';

-- Erfolgsmeldung
DO $$
BEGIN
    RAISE NOTICE 'Migration erfolgreich durchgeführt!';
    RAISE NOTICE 'Felder begonnen_am, prioritaet und meister_zugewiesen wurden hinzugefügt.';
END $$;
