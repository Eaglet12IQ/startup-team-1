import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, PiAuthProvider } from './context/AuthContext'
import './index.css'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Pricing } from './pages/Pricing'
import { Profile } from './pages/Profile'
import { ProjectsList } from './pages/ProjectsList'
import { Editor } from './pages/Editor'

const PI_MODE = import.meta.env.VITE_PI_MODE === 'true'

function AnimatedRoutes() {
  const location = useLocation()

  if (PI_MODE) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/editor/:projectId" element={<Editor />} />
      </Routes>
    </AnimatePresence>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {PI_MODE ? (
        <PiAuthProvider>
          <AnimatedRoutes />
        </PiAuthProvider>
      ) : (
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      )}
    </BrowserRouter>
  </StrictMode>,
)