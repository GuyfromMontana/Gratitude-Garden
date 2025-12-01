import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Home, Upload, BookOpen, Volume2, Heart, LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import AuthPage from './components/AuthPage.jsx'
import DailyGratitude from './components/DailyGratitude'
import MemoryUpload from './components/MemoryUpload'
import MemoryBrowser from './components/MemoryBrowser'
import VoiceManagement from './components/VoiceManagement'

function AppContent() {
  const { user, signOut, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Heart className="loading-icon" size={48} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
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
          <button onClick={signOut} className="logout-button">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
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
            <Route path="/" element={<DailyGratitude userId={user.id} />} />
            <Route path="/upload" element={<MemoryUpload userId={user.id} />} />
            <Route path="/browse" element={<MemoryBrowser userId={user.id} />} />
            <Route path="/voices" element={<VoiceManagement userId={user.id} />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>50 years of memories • Growing gratitude daily</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
