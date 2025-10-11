import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from './redux/slices/authSlice'
import { useEffect } from 'react';
import { useCSRF } from './context/CSRFContext';

import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './components/Auth/Login'

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
  const { csrfToken } = useCSRF();

  return (
    <Router>
      <Routes>
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

        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/tasks" element={<AllTasksPage />} />
                <Route path="/tasks/:taskId" element={<TaskMain />} />

                <Route path="/notifications" element={<Notifications />} />

                <Route path="/admin/user-management" element={<UserManagement />} />
                <Route path="/admin/absence-tracker" element={<AbsenceTracker />} />

                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/reports" element={<ReportsPage />} />

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