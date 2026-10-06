-- Urbaniza+ | Fase 4 — módulo de notícias (Comunidade)
-- Banco: urbanizamais (MySQL 8, InnoDB, utf8mb4_0900_ai_ci)
--
-- Como aplicar:
--   mysql -u <usuario> -p urbanizamais < database/news_schema.sql
--
-- Rollback:
--   DROP TABLE IF EXISTS news;
--
-- A coluna `content` guarda a lista ordenada de blocos do editor como JSON.
-- O contrato dos blocos é validado em src/services/newsBlocks.ts.

CREATE TABLE IF NOT EXISTS news (
  id            INT NOT NULL AUTO_INCREMENT,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(500) NULL,
  cover_image   VARCHAR(255) NULL,
  cover_caption VARCHAR(255) NULL,
  content       JSON NOT NULL,
  author_id     INT NOT NULL,
  city_id       INT NOT NULL,
  status        ENUM('rascunho','publicado') NOT NULL DEFAULT 'rascunho',
  published_at  DATETIME NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_news_status_published (status, published_at),
  KEY idx_news_city (city_id),
  KEY idx_news_author (author_id),
  CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_news_city   FOREIGN KEY (city_id)   REFERENCES cities (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
