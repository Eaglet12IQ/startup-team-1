import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Pricing } from './pages/Pricing'
import { Profile } from './pages/Profile'
import { ProjectsList } from './pages/ProjectsList'
import { Editor } from './pages/Editor'

const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    { path: '/register', element: <Register /> },
    { path: '/pricing', element: <Pricing /> },
    { path: '/profile', element: <Profile /> },
    { path: '/projects', element: <ProjectsList /> },
    { path: '/editor/:projectId', element: <Editor /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <RouterProvider router={router} />
  </StrictMode>,
)
