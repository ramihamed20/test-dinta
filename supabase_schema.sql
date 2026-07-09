-- Create public tables for Dentify

-- Enable Row Level Security (RLS) or disable it for easy testing
-- We will disable RLS for public tables so the client can query them directly without complex policy rules during testing.

-- 1. Materials Table
CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES public.materials(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    choices_json TEXT NOT NULL, -- JSON array of choices
    correct_choice TEXT NOT NULL,
    explanation TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Medium'
);

-- 3. Material Sheets Table
CREATE TABLE IF NOT EXISTS public.material_sheets (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES public.materials(id) ON DELETE CASCADE,
    sheet_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    total_pages INTEGER DEFAULT 12,
    summary TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    UNIQUE(material_id, sheet_number)
);

-- 4. User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    year TEXT DEFAULT '3rd Year',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Attempts Table (to track solved questions)
CREATE TABLE IF NOT EXISTS public.attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_choice TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Community Posts Table
CREATE TABLE IF NOT EXISTS public.community_posts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Study Plan Table
CREATE TABLE IF NOT EXISTS public.study_plan (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    topic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    metric TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    order_index INTEGER DEFAULT 0
);

-- 10. User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY(user_id, achievement_id)
);

-- 11. Leaderboard Entries Table
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    meta TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 100,
    rank INTEGER NOT NULL
);


-- ==================== SEED DATA ====================

-- Insert Materials
INSERT INTO public.materials (id, title, slug, description, icon, order_index) VALUES
(1, 'Oral Anatomy', 'oral-anatomy', 'Tooth morphology, arches, nerve branches, and key landmarks.', 'book-open', 1),
(2, 'Oral Histology', 'oral-histology', 'Enamel, dentin, pulp, periodontium, and developmental tissues.', 'microscope', 2),
(3, 'Prosthodontics', 'prosthodontics', 'Impressions, occlusion, dentures, crowns, and treatment planning.', 'sparkles', 3),
(4, 'Periodontology', 'periodontology', 'Gingiva, pocket charting, inflammation, and periodontal therapy.', 'activity', 4),
(5, 'Endodontics', 'endodontics', 'Pulp disease, diagnosis, access cavities, irrigation, and obturation.', 'target', 5),
(6, 'Local Anesthesia', 'local-anesthesia', 'Injection techniques, doses, nerves, complications, and safety.', 'syringe', 6),
(7, 'Dental Materials', 'dental-materials', 'Cements, composites, impression materials, gypsum, and ceramics.', 'layers', 7)
ON CONFLICT (id) DO NOTHING;

-- Insert Questions
INSERT INTO public.questions (id, material_id, prompt, choices_json, correct_choice, explanation, difficulty) VALUES
(1, 1, 'Which tissue forms the main bulk of the tooth?', '["Enamel", "Dentin", "Cementum", "Pulp"]', 'Dentin', 'Dentin surrounds the pulp and forms most of the tooth structure.', 'Easy'),
(2, 1, 'The mandibular nerve exits the skull through which foramen?', '["Foramen ovale", "Foramen rotundum", "Stylomastoid foramen", "Mental foramen"]', 'Foramen ovale', 'The mandibular division of the trigeminal nerve exits through the foramen ovale.', 'Medium'),
(3, 2, 'Which cells are responsible for enamel formation?', '["Odontoblasts", "Ameloblasts", "Cementoblasts", "Fibroblasts"]', 'Ameloblasts', 'Ameloblasts produce enamel matrix during tooth development.', 'Easy'),
(4, 3, 'Which material is commonly used for preliminary impressions?', '["Alginate", "Zinc phosphate", "Composite resin", "Amalgam"]', 'Alginate', 'Alginate is a common irreversible hydrocolloid for preliminary impressions.', 'Easy'),
(5, 4, 'What is the normal probing depth range for healthy gingiva?', '["0-1 mm", "1-3 mm", "4-6 mm", "7-9 mm"]', '1-3 mm', 'Healthy periodontal probing depths are generally within 1-3 mm.', 'Medium'),
(6, 5, 'Which irrigant is widely used for dissolving organic tissue in root canals?', '["Saline", "Sodium hypochlorite", "Distilled water", "Ethanol"]', 'Sodium hypochlorite', 'Sodium hypochlorite dissolves organic tissue and has antimicrobial activity.', 'Medium'),
(7, 6, 'Which nerve block is used to anesthetize mandibular molars?', '["Infraorbital block", "Inferior alveolar nerve block", "Greater palatine block", "Nasopalatine block"]', 'Inferior alveolar nerve block', 'The inferior alveolar nerve block is commonly used for mandibular posterior teeth.', 'Easy'),
(8, 7, 'Which phase gives dental amalgam its major strength?', '["Gamma", "Gamma-1", "Gamma-2", "Eta"]', 'Gamma-1', 'Gamma-1 is a strong silver-mercury phase in set amalgam.', 'Hard')
ON CONFLICT (id) DO NOTHING;

-- Insert Material Sheets (6 sheets for each material)
INSERT INTO public.material_sheets (id, material_id, sheet_number, title, total_pages, summary, order_index) VALUES
(1, 1, 1, 'Tooth morphology', 8, 'Introduction to the structures, traits, and terms of primary and permanent human dentition.', 1),
(2, 1, 2, 'Dental arches', 8, 'Detailed overview of mandibular and maxillary arches, alignments, and curvature basics.', 2),
(3, 1, 3, 'Mandibular landmarks', 8, 'Skeletal anatomy, bone density variations, and key anatomical markers of the mandible.', 3),
(4, 1, 4, 'Maxillary landmarks', 8, 'Anatomy of the maxilla, sinus structures, and major surrounding structures.', 4),
(5, 1, 5, 'Occlusion basics', 8, 'Understanding cusp-to-fossa relations, alignments, and classification of occlusion.', 5),
(6, 1, 6, 'Nerve branches', 8, 'Review of the trigeminal nerve divisions, dental plexus innervation, and pathways.', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert Achievements
INSERT INTO public.achievements (id, title, description, icon, metric, threshold, order_index) VALUES
(1, 'Streak Badge', 'Keep a 14 day study streak.', 'activity', 'streakDays', 14, 1),
(2, 'Ranking Badge', 'Reach the top 12% in batch ranking.', 'trophy', 'rankedPoints', 3000, 2),
(3, 'Question Solver', 'Solve your first 10 questions.', 'help', 'questionsSolved', 10, 3),
(4, 'Review Finisher', 'Create five review items from weak answers.', 'check', 'reviewCount', 5, 4),
(5, 'Bookmark Keeper', 'Save five learning items for later.', 'bookmark', 'savedItems', 5, 5),
(6, 'Material Explorer', 'Open progress across all seven dental materials.', 'book-open', 'materialsCompleted', 7, 6)
ON CONFLICT (id) DO NOTHING;

-- Insert Leaderboard
INSERT INTO public.leaderboard (id, type, name, title, meta, points, accuracy, rank) VALUES
(1, 'weekly', 'Lina A.', 'Weekly Champion', '186 solved', 4820, 94, 1),
(2, 'weekly', 'Omar M.', 'Second Place', '171 solved', 4510, 91, 2),
(3, 'weekly', 'Sara K.', 'Third Place', '164 solved', 4240, 89, 3),
(4, 'weekly', 'Yousef N.', 'Strong Finish', '152 solved', 3970, 87, 4),
(5, 'monthly', 'Nour H.', 'Monthly Champion', '620 solved', 12840, 92, 1),
(6, 'monthly', 'Ali R.', 'Second Place', '584 solved', 11920, 90, 2),
(7, 'monthly', 'Maya S.', 'Third Place', '558 solved', 11280, 88, 3),
(8, 'monthly', 'Hiba F.', 'Strong Finish', '531 solved', 10640, 86, 4)
ON CONFLICT (id) DO NOTHING;
