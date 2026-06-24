import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { DataProvider } from './contexts/DataContext'
import AppShell from './components/common/AppShell'
import ToastContainer from './components/common/ToastContainer'
import CommandPalette from './components/search/CommandPalette'
import { lazy, Suspense } from 'react'
import LoadingScreen from './components/common/LoadingScreen'

// Lazy-loaded pages
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ChaptersPage = lazy(() => import('./pages/ChaptersPage'))
const ChapterDetailPage = lazy(() => import('./pages/ChapterDetailPage'))
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const TodosPage = lazy(() => import('./pages/TodosPage'))
const FocusPage = lazy(() => import('./pages/FocusPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppContent() {
  return (
    <AppProvider>
      <DataProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/auth" element={
                <PublicRoute><AuthPage /></PublicRoute>
              } />
              <Route path="/onboarding" element={
                <ProtectedRoute><OnboardingPage /></ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="chapters" element={<ChaptersPage />} />
                <Route path="chapters/:id" element={<ChapterDetailPage />} />
                <Route path="planner" element={<PlannerPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="todos" element={<TodosPage />} />
                <Route path="focus" element={<FocusPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <CommandPalette />
          <ToastContainer />
        </BrowserRouter>
      </DataProvider>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
