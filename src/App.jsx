import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Home, Upload, BookOpen, Heart, Volume2 } from 'lucide-react'
import DailyGratitude from './components/DailyGratitude'
import MemoryUpload from './components/MemoryUpload'
import MemoryBrowser from './components/MemoryBrowser'
import VoiceManagement from './components/VoiceManagement'
import { supabase } from './lib/supabase'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For Phase 1, we'll create/use a single user
    initializeUser()
  }, [])

  async function initializeUser() {
    try {
      // Check if user exists, if not create one
      let { data: users, error } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user:', error)
      }

      if (!users || users.length === 0) {
        // Create initial user for Phase 1
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ 
            display_name: 'Guy',
            email: 'guy@gratitudegarden.local'
          }])
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
        } else {
          setUser(newUser)
        }
      } else {
        setUser(users[0])
      }
    } catch (err) {
      console.error('Init error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Heart className="loading-icon" size={48} />
          <p>Loading your memories...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              <Heart className="title-icon" size={28} />
              Gratitude Garden
            </h1>
            <p className="app-subtitle">Cultivating appreciation from a lifetime of memories</p>
          </div>
        </header>

        <nav className="app-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Home size={20} />
            <span>Today</span>
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Upload size={20} />
            <span>Upload</span>
          </NavLink>
          <NavLink to="/browse" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <BookOpen size={20} />
            <span>Browse</span>
          </NavLink>
          <NavLink to="/voices" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Volume2 size={20} />
            <span>Voices</span>
          </NavLink>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<DailyGratitude userId={user?.id} />} />
            <Route path="/upload" element={<MemoryUpload userId={user?.id} />} />
            <Route path="/browse" element={<MemoryBrowser userId={user?.id} />} />
            <Route path="/voices" element={<VoiceManagement userId={user?.id} />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>50 years of memories • Growing gratitude daily</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
