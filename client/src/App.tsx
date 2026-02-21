import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GuestListPage } from '@/pages/GuestListPage';
import { RsvpPage } from '@/pages/RsvpPage';
import { CreateEventPage } from '@/pages/CreateEventPage';
import { EventDetailPage } from '@/pages/EventDetailPage';

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/rsvp/:token" element={<RsvpPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/events/new" element={<Protected><CreateEventPage /></Protected>} />
          <Route path="/events/:id" element={<Protected><EventDetailPage /></Protected>} />
          <Route path="/events/:eventId/guests" element={<Protected><GuestListPage /></Protected>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
