-- Autorisation specifique NAP commune, sauvegarde restauree et C0 TEST/PROD
-- verifies obligatoires. Execute uniquement par le controle de migration dedie.
-- Aucun original, aucune ligne documentaire et aucun rang initial ne sont ecrits.
ALTER TABLE livepalmes_document_options
  MODIFY COLUMN category varchar(16) NULL DEFAULT NULL,
  MODIFY COLUMN file_name varchar(180) NULL DEFAULT NULL,
  MODIFY COLUMN storage_path varchar(160) NULL DEFAULT NULL,
  MODIFY COLUMN content_type varchar(100) NULL DEFAULT NULL,
  MODIFY COLUMN size int unsigned NULL DEFAULT NULL,
  ADD COLUMN featured_rank tinyint unsigned NULL DEFAULT NULL,
  ADD UNIQUE KEY livepalmes_document_featured_rank (featured_rank);
