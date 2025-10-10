-- =========================
-- Criação das tabelas
-- =========================

CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE developer (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    release_date DATE,
    developer_id INT,
    image_id INT UNIQUE,
    CONSTRAINT fk_developer FOREIGN KEY (developer_id)
        REFERENCES developer(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);

CREATE TABLE image (
    id SERIAL PRIMARY KEY,
    data BYTEA NOT NULL,
    game_id INT UNIQUE,
    CONSTRAINT fk_game FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- Ajuste para relacionamento cíclico:
ALTER TABLE games
    ADD CONSTRAINT fk_image FOREIGN KEY (image_id)
        REFERENCES image(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;

CREATE TABLE game_category (
    game_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (game_id, category_id),
    CONSTRAINT fk_game_category_game FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,
    CONSTRAINT fk_game_category_category FOREIGN KEY (category_id)
        REFERENCES category(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);

CREATE TABLE user_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_status INT DEFAULT 2,
    CONSTRAINT fk_user_status FOREIGN KEY (user_status)
        REFERENCES user_status(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);

CREATE TABLE library (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    game_id INT NOT NULL,
    CONSTRAINT fk_library_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    CONSTRAINT fk_library_game FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- =====================================
-- Correções/ajustes de sequences e constraints
-- =====================================

-- Garante sequência e default para category, developer e games
DO $$
BEGIN
  -- CATEGORY
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'category_id_seq') THEN
    CREATE SEQUENCE category_id_seq START 1;
  END IF;
  ALTER TABLE category ALTER COLUMN id SET DEFAULT nextval('category_id_seq');
  PERFORM setval('category_id_seq', (SELECT COALESCE(MAX(id),0) + 1 FROM category), false);

  -- DEVELOPER
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'developer_id_seq') THEN
    CREATE SEQUENCE developer_id_seq START 1;
  END IF;
  ALTER TABLE developer ALTER COLUMN id SET DEFAULT nextval('developer_id_seq');
  PERFORM setval('developer_id_seq', (SELECT COALESCE(MAX(id),0) + 1 FROM developer), false);

  -- GAMES
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'games_id_seq') THEN
    CREATE SEQUENCE games_id_seq START 1;
  END IF;
  ALTER TABLE games ALTER COLUMN id SET DEFAULT nextval('games_id_seq');
  PERFORM setval('games_id_seq', (SELECT COALESCE(MAX(id),0) + 1 FROM games), false);
END $$;

-- Cria constraint única em library(user_id, game_id) se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'u'
          AND t.relname = 'library'
          AND (SELECT array_to_string(array_agg(att.attname), ',')
               FROM unnest(c.conkey) WITH ORDINALITY ck(attnum, ord)
               JOIN pg_attribute att ON att.attnum = ck.attnum AND att.attrelid = t.oid
              ) LIKE '%user_id%'
    ) THEN
        ALTER TABLE library
        ADD CONSTRAINT library_user_game_unique UNIQUE (user_id, game_id);
    END IF;
END$$;