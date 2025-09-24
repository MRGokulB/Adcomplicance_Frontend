import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from './redux/slices/authSlice'

// Layout and Protected Route
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Auth Components
import Login from './components/Auth/Login'

// Page Components
import ProfilePage from './components/Profile/ProfilePage'
import Dashboard from './components/Dashboard/Dashboard'
import Notifications from './components/Notifications/Notifications'
import AuditLog from './components/AuditLog/AuditLog'
import ReportsPage from './components/Reports/ReportsPage'
import AllTasksPage from './components/AllTasks/AllTasks'
import TaskMain from './components/Tasks/TaskMain'
import UserManagement from './components/Admin/UserManagement/UserManagement'
import AbsenceTracker from './components/Admin/UserManagement/AbsenceTracker'

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated)

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          } 
        />

        {/* Protected Routes - Wrapped in Layout */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route path="/profile" element={<ProfilePage />} />
                {/* Main Application Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* Tasks Routes */}
                <Route path="/tasks" element={<AllTasksPage />} />
                <Route path="/tasks/:taskId" element={<TaskMain />} />
                
                {/* Notifications */}
                <Route path="/notifications" element={<Notifications />} />
                
                {/* Admin Routes - Role-based access can be added later */}
                <Route path="/admin/user-management" element={<UserManagement />} />
                <Route path="/admin/absence-tracker" element={<AbsenceTracker />} />
                
                {/* Other Routes */}
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* 404 Handler */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App