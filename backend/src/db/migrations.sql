CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ARTIST', 'ADMIN')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    cover_art_url TEXT,
    cover_art_object_key TEXT,
    cover_art_public_url TEXT,
    status TEXT NOT NULL CHECK (
        status IN ('DRAFT', 'PROCESSING', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED')
    ),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    isrc TEXT NOT NULL,
    audio_url TEXT,
    audio_object_key TEXT,
    audio_public_url TEXT,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_art_object_key TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_art_public_url TEXT;

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_object_key TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_public_url TEXT;

ALTER TABLE tracks ALTER COLUMN audio_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_releases_artist ON releases(artist_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_id);

ALTER TABLE releases ALTER COLUMN status SET DEFAULT 'DRAFT';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tracks_duration_positive'
    ) THEN
        ALTER TABLE tracks
            ADD CONSTRAINT tracks_duration_positive
            CHECK (duration IS NULL OR duration > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tracks_isrc_length'
    ) THEN
        ALTER TABLE tracks
            ADD CONSTRAINT tracks_isrc_length
            CHECK (length(isrc) = 12);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_isrc ON tracks(isrc);

CREATE OR REPLACE FUNCTION enforce_release_artist_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = NEW.artist_id
          AND u.role = 'ARTIST'
    ) THEN
        RAISE EXCEPTION 'artist_id must reference a user with role ARTIST'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_releases_artist_role ON releases;
CREATE TRIGGER trg_releases_artist_role
BEFORE INSERT OR UPDATE OF artist_id ON releases
FOR EACH ROW
EXECUTE FUNCTION enforce_release_artist_role();

CREATE OR REPLACE FUNCTION enforce_release_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IS NULL THEN
            NEW.status := 'DRAFT';
        END IF;

        IF NEW.status <> 'DRAFT' THEN
            RAISE EXCEPTION 'new releases must start in DRAFT status'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
        IF NOT (
            (OLD.status = 'DRAFT' AND NEW.status IN ('PROCESSING')) OR
            (OLD.status = 'PROCESSING' AND NEW.status IN ('PENDING_REVIEW')) OR
            (OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('PUBLISHED', 'REJECTED')) OR
            (OLD.status = 'REJECTED' AND NEW.status IN ('DRAFT')) OR
            (OLD.status = 'PUBLISHED' AND NEW.status IN ('PUBLISHED'))
        ) THEN
            RAISE EXCEPTION 'invalid release status transition from % to %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_releases_status_transition ON releases;
CREATE TRIGGER trg_releases_status_transition
BEFORE INSERT OR UPDATE OF status ON releases
FOR EACH ROW
EXECUTE FUNCTION enforce_release_status_transition();
