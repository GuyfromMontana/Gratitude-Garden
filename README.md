# Gratitude Garden

A personal gratitude app that transforms your collection of cards, letters, and memories into a daily practice of appreciation and reflection.

## Overview

Upload scanned cards and letters you've collected over the years. The app uses AI to extract themes, create reflection prompts, and surface memories based on seasons and holidays—helping you savor positive experiences from your past.

## Features

- **Memory Upload**: Scan and upload cards, letters, photos with metadata
- **AI Extraction**: Automatically identifies gratitude themes, creates story summaries, and generates reflection prompts
- **Seasonal Surfacing**: Daily memories matched to current season and upcoming holidays
- **Reflection Journal**: Record your thoughts on each memory
- **Theme Browsing**: Explore memories by theme (Family Support, Unexpected Kindness, etc.)
- **Voice Ready**: Schema designed for future voice integration

## Tech Stack

- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API for content extraction
- **Hosting**: Vercel or Railway

## Setup Instructions

### 1. Clone and Install

```bash
cd gratitude-app
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_claude_api_key
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
gratitude-app/
├── README.md
├── package.json
├── .env.example
├── vite.config.js
├── index.html
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── components/
    │   ├── MemoryUpload.jsx
    │   ├── DailyGratitude.jsx
    │   ├── MemoryBrowser.jsx
    │   └── ReflectionInput.jsx
    └── lib/
        ├── supabase.js
        ├── ai-extraction.js
        └── surfacing-logic.js
```

## Phase 2: Multi-User Version

The database schema is already designed for multiple users. When ready to deploy for others:

1. Enable Supabase Auth
2. Add Row Level Security policies (templates included in schema)
3. Deploy to Vercel/Railway with production environment variables

## License

Personal use - Phase 1
