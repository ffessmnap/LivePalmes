-- Proposition uniquement : ne pas executer avant accord specifique.
-- Les titres, liens, descriptions et rattachements restent dans documents.
-- Ce complement conserve les options deja proposees par LivePalmes.
CREATE TABLE `livepalmes_document_options` (
  `document_id` int NOT NULL,
  `category` varchar(16) NOT NULL,
  `file_name` varchar(180) NOT NULL,
  `storage_path` varchar(160) NOT NULL,
  `content_type` varchar(100) NOT NULL,
  `size` int unsigned NOT NULL,
  `version` bigint unsigned NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `created_by` varchar(128) NOT NULL,
  `updated_by` varchar(128) NOT NULL,
  PRIMARY KEY (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
