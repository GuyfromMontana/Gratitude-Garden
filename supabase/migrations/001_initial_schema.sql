-- Gratitude Garden Database Schema
-- Version 1.0 - Voice Ready, Multi-User Ready
-- Run this in Supabase SQL Editor

-- ============================================
-- USERS TABLE
-- Ready for Phase 2 multi-user deployment
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    display_name TEXT,
    
    -- Preferences (JSON for flexibility)
    preferences JSONB DEFAULT '{
        "daily_reminder_time": null,
        "preferred_voice_id": null,
        "theme": "warm"
    }'::jsonb,
    
    -- Voice settings (for future Vapi integration)
    voice_enabled BOOLEAN DEFAULT false,
    voice_phone_number TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMORIES TABLE
-- The raw scanned cards, letters, photos
-- ============================================
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Source content
    original_image_url TEXT,           -- Supabase Storage URL for scanned image
    extracted_text TEXT,               -- OCR'd or manually entered text
    
    -- Metadata about the original
    source_type TEXT CHECK (source_type IN (
        'card', 'letter', 'photo', 'note', 'email', 'other'
    )) DEFAULT 'card',
    
    sender_name TEXT,                  -- Who sent it (optional)
    date_received DATE,                -- When you received it (optional)
    occasion TEXT,                     -- Birthday, Christmas, Just Because, etc.
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false, -- Has AI extracted gratitude entries?
    processing_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GRATITUDE ENTRIES TABLE
-- AI-extracted structured content from memories
-- One memory can have multiple gratitude entries
-- ============================================
CREATE TABLE gratitude_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique identifier (like 'FAM-001', 'KIN-023')
    entry_code TEXT,
    
    -- Core extracted content (from your JSON schema)
    core_theme TEXT NOT NULL,          -- 'Unexpected Kindness', 'Family Support', etc.
    summary_story TEXT,                -- 100-word anonymized narrative
    specific_details JSONB DEFAULT '[]'::jsonb,  -- Array of sensory/concrete details
    reflection_prompt TEXT,            -- Question for daily reflection
    tags JSONB DEFAULT '[]'::jsonb,    -- ['People', 'Career', 'Nature', 'Small Wins']
    
    -- Seasonal/Holiday matching for surfacing
    season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'any')),
    holiday_associations JSONB DEFAULT '[]'::jsonb,  -- ['Christmas', 'Thanksgiving', 'Birthday']
    month_associations JSONB DEFAULT '[]'::jsonb,    -- [1, 2, 12] for specific months
    
    -- Voice-ready fields
    audio_story_url TEXT,              -- Pre-generated audio of summary_story
    audio_prompt_url TEXT,             -- Pre-generated audio of reflection_prompt
    
    -- Emotional metadata
    emotional_intensity INTEGER CHECK (emotional_intensity BETWEEN 1 AND 5),  -- 1=gentle, 5=profound
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REFLECTIONS TABLE
-- User's responses to gratitude entries
-- ============================================
CREATE TABLE reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gratitude_entry_id UUID REFERENCES gratitude_entries(id) ON DELETE CASCADE,
    
    -- Written reflection
    reflection_text TEXT,
    
    -- Voice reflection (for future Vapi integration)
    reflection_audio_url TEXT,
    reflection_transcript TEXT,        -- Transcription of voice reflection
    
    -- Emotional tracking
    emotion_tags JSONB DEFAULT '[]'::jsonb,  -- ['grateful', 'nostalgic', 'peaceful']
    mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY SURFACES TABLE
-- Tracks what's been shown and when
-- ============================================
CREATE TABLE daily_surfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gratitude_entry_id UUID REFERENCES gratitude_entries(id) ON DELETE CASCADE,
    
    surfaced_date DATE NOT NULL,
    surfacing_reason TEXT,             -- 'holiday:Thanksgiving', 'season:winter', 'variety'
    
    was_viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMPTZ,
    
    reflection_id UUID REFERENCES reflections(id),  -- Links to reflection if user responded
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate surfaces on same day
    UNIQUE(user_id, gratitude_entry_id, surfaced_date)
);

-- ============================================
-- SEASONS & HOLIDAYS REFERENCE TABLE
-- For the surfacing logic
-- ============================================
CREATE TABLE seasons_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                -- 'Christmas', 'Thanksgiving', 'spring'
    type TEXT CHECK (type IN ('holiday', 'season')) NOT NULL,
    
    -- For holidays: specific date or date range
    month INTEGER,                     -- 1-12
    day INTEGER,                       -- 1-31 (null for seasons)
    start_month INTEGER,               -- For seasons or multi-day holidays
    end_month INTEGER,
    
    -- How many days before/after to surface related memories
    surfacing_window_days INTEGER DEFAULT 7,
    
    -- Related themes to match
    related_themes JSONB DEFAULT '[]'::jsonb,  -- ['Family Support', 'Gratitude', 'Celebration']
    
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- INSERT DEFAULT SEASONS & HOLIDAYS
-- ============================================
INSERT INTO seasons_holidays (name, type, month, day, start_month, end_month, surfacing_window_days, related_themes) VALUES
-- Seasons (meteorological)
('spring', 'season', NULL, NULL, 3, 5, 0, '["Renewal", "Growth", "Nature", "Hope"]'),
('summer', 'season', NULL, NULL, 6, 8, 0, '["Joy", "Adventure", "Family", "Celebration"]'),
('fall', 'season', NULL, NULL, 9, 11, 0, '["Gratitude", "Harvest", "Change", "Reflection"]'),
('winter', 'season', NULL, NULL, 12, 2, 0, '["Warmth", "Family", "Kindness", "Hope"]'),

-- Major US Holidays
('New Year', 'holiday', 1, 1, NULL, NULL, 5, '["Hope", "Renewal", "Celebration", "Reflection"]'),
('Valentine''s Day', 'holiday', 2, 14, NULL, NULL, 7, '["Love", "Friendship", "Kindness", "Romance"]'),
('Easter', 'holiday', 4, 15, NULL, NULL, 7, '["Family", "Renewal", "Faith", "Celebration"]'),
('Mother''s Day', 'holiday', 5, 12, NULL, NULL, 7, '["Family Support", "Love", "Appreciation", "Mentorship"]'),
('Father''s Day', 'holiday', 6, 15, NULL, NULL, 7, '["Family Support", "Love", "Appreciation", "Mentorship"]'),
('Independence Day', 'holiday', 7, 4, NULL, NULL, 5, '["Celebration", "Community", "Joy"]'),
('Thanksgiving', 'holiday', 11, 28, NULL, NULL, 10, '["Gratitude", "Family", "Abundance", "Appreciation"]'),
('Christmas', 'holiday', 12, 25, NULL, NULL, 14, '["Kindness", "Family", "Generosity", "Joy", "Celebration"]'),

-- Personal occasions (user can customize)
('Birthday', 'holiday', NULL, NULL, NULL, NULL, 7, '["Celebration", "Personal Growth", "Love", "Appreciation"]'),
('Anniversary', 'holiday', NULL, NULL, NULL, NULL, 7, '["Love", "Commitment", "Appreciation", "Milestone"]');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_processed ON memories(is_processed);
CREATE INDEX idx_gratitude_entries_user ON gratitude_entries(user_id);
CREATE INDEX idx_gratitude_entries_season ON gratitude_entries(season);
CREATE INDEX idx_gratitude_entries_theme ON gratitude_entries(core_theme);
CREATE INDEX idx_daily_surfaces_user_date ON daily_surfaces(user_id, surfaced_date);
CREATE INDEX idx_reflections_user ON reflections(user_id);

-- GIN indexes for JSONB arrays
CREATE INDEX idx_gratitude_entries_tags ON gratitude_entries USING GIN (tags);
CREATE INDEX idx_gratitude_entries_holidays ON gratitude_entries USING GIN (holiday_associations);

-- ============================================
-- ROW LEVEL SECURITY (for Phase 2)
-- Enable when ready for multi-user
-- ============================================

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_surfaces ENABLE ROW LEVEL SECURITY;

-- Example policies (uncomment for Phase 2):
-- CREATE POLICY "Users can view own data" ON memories FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own data" ON memories FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own data" ON memories FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own data" ON memories FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get current season
CREATE OR REPLACE FUNCTION get_current_season()
RETURNS TEXT AS $$
DECLARE
    current_month INTEGER;
BEGIN
    current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    
    IF current_month IN (3, 4, 5) THEN
        RETURN 'spring';
    ELSIF current_month IN (6, 7, 8) THEN
        RETURN 'summer';
    ELSIF current_month IN (9, 10, 11) THEN
        RETURN 'fall';
    ELSE
        RETURN 'winter';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a holiday is upcoming (within window)
CREATE OR REPLACE FUNCTION is_holiday_upcoming(holiday_name TEXT, window_days INTEGER DEFAULT 7)
RETURNS BOOLEAN AS $$
DECLARE
    holiday_record RECORD;
    holiday_date DATE;
    current_year INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT * INTO holiday_record 
    FROM seasons_holidays 
    WHERE name = holiday_name AND type = 'holiday' AND is_active = true;
    
    IF holiday_record IS NULL OR holiday_record.month IS NULL THEN
        RETURN false;
    END IF;
    
    holiday_date := make_date(current_year, holiday_record.month, holiday_record.day);
    
    -- If holiday already passed this year, check next year
    IF holiday_date < CURRENT_DATE THEN
        holiday_date := make_date(current_year + 1, holiday_record.month, holiday_record.day);
    END IF;
    
    RETURN (holiday_date - CURRENT_DATE) <= window_days;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's recommended gratitude entry for a user
CREATE OR REPLACE FUNCTION get_daily_gratitude(p_user_id UUID)
RETURNS TABLE (
    entry_id UUID,
    core_theme TEXT,
    summary_story TEXT,
    reflection_prompt TEXT,
    surfacing_reason TEXT
) AS $$
DECLARE
    current_season TEXT;
    upcoming_holiday TEXT;
    result_entry_id UUID;
    result_reason TEXT;
BEGIN
    current_season := get_current_season();
    
    -- Check if already surfaced today
    SELECT ge.id, ds.surfacing_reason INTO result_entry_id, result_reason
    FROM daily_surfaces ds
    JOIN gratitude_entries ge ON ge.id = ds.gratitude_entry_id
    WHERE ds.user_id = p_user_id 
    AND ds.surfaced_date = CURRENT_DATE;
    
    IF result_entry_id IS NOT NULL THEN
        RETURN QUERY
        SELECT ge.id, ge.core_theme, ge.summary_story, ge.reflection_prompt, result_reason
        FROM gratitude_entries ge
        WHERE ge.id = result_entry_id;
        RETURN;
    END IF;
    
    -- Check for upcoming holidays
    SELECT sh.name INTO upcoming_holiday
    FROM seasons_holidays sh
    WHERE sh.type = 'holiday' 
    AND sh.is_active = true
    AND is_holiday_upcoming(sh.name, sh.surfacing_window_days)
    LIMIT 1;
    
    -- Priority 1: Holiday-associated entry not shown recently
    IF upcoming_holiday IS NOT NULL THEN
        SELECT ge.id INTO result_entry_id
        FROM gratitude_entries ge
        WHERE ge.user_id = p_user_id
        AND ge.holiday_associations ? upcoming_holiday
        AND ge.id NOT IN (
            SELECT ds.gratitude_entry_id 
            FROM daily_surfaces ds 
            WHERE ds.user_id = p_user_id 
            AND ds.surfaced_date > CURRENT_DATE - INTERVAL '30 days'
        )
        ORDER BY RANDOM()
        LIMIT 1;
        
        IF result_entry_id IS NOT NULL THEN
            result_reason := 'holiday:' || upcoming_holiday;
        END IF;
    END IF;
    
    -- Priority 2: Season-matched entry
    IF result_entry_id IS NULL THEN
        SELECT ge.id INTO result_entry_id
        FROM gratitude_entries ge
        WHERE ge.user_id = p_user_id
        AND (ge.season = current_season OR ge.season = 'any')
        AND ge.id NOT IN (
            SELECT ds.gratitude_entry_id 
            FROM daily_surfaces ds 
            WHERE ds.user_id = p_user_id 
            AND ds.surfaced_date > CURRENT_DATE - INTERVAL '14 days'
        )
        ORDER BY RANDOM()
        LIMIT 1;
        
        IF result_entry_id IS NOT NULL THEN
            result_reason := 'season:' || current_season;
        END IF;
    END IF;
    
    -- Priority 3: Any entry not shown recently
    IF result_entry_id IS NULL THEN
        SELECT ge.id INTO result_entry_id
        FROM gratitude_entries ge
        WHERE ge.user_id = p_user_id
        AND ge.id NOT IN (
            SELECT ds.gratitude_entry_id 
            FROM daily_surfaces ds 
            WHERE ds.user_id = p_user_id 
            AND ds.surfaced_date > CURRENT_DATE - INTERVAL '7 days'
        )
        ORDER BY RANDOM()
        LIMIT 1;
        
        result_reason := 'variety';
    END IF;
    
    -- If still nothing, just get any entry
    IF result_entry_id IS NULL THEN
        SELECT ge.id INTO result_entry_id
        FROM gratitude_entries ge
        WHERE ge.user_id = p_user_id
        ORDER BY RANDOM()
        LIMIT 1;
        
        result_reason := 'random';
    END IF;
    
    -- Record the surface
    IF result_entry_id IS NOT NULL THEN
        INSERT INTO daily_surfaces (user_id, gratitude_entry_id, surfaced_date, surfacing_reason)
        VALUES (p_user_id, result_entry_id, CURRENT_DATE, result_reason)
        ON CONFLICT (user_id, gratitude_entry_id, surfaced_date) DO NOTHING;
    END IF;
    
    -- Return the entry
    RETURN QUERY
    SELECT ge.id, ge.core_theme, ge.summary_story, ge.reflection_prompt, result_reason
    FROM gratitude_entries ge
    WHERE ge.id = result_entry_id;
END;
$$ LANGUAGE plpgsql;
