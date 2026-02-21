import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { EventCard, type EventSummary } from '@/components/EventCard';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`/api/events?page=${page}&limit=${LIMIT}`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setEvents(data.events);
    setTotal(data.total);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handlePublish(id: string) {
    await fetch(`/api/events/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    fetchEvents();
  }

  async function handleCancel(id: string, title: string) {
    if (!confirm(`לבטל את האירוע "${title}"?`)) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchEvents();
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-muted/40 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">אירועית</h1>
            <p className="text-muted-foreground text-sm mt-1">
              שלום, {user?.display_name} • {user?.role === 'organizer' ? 'מארגן אירועים' : 'ספק שירותים'}
            </p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'organizer' && (
              <Button asChild>
                <Link to="/events/new">+ אירוע חדש</Link>
              </Button>
            )}
            <Button variant="outline" onClick={logout}>התנתקות</Button>
          </div>
        </div>

        {/* Event list */}
        {loading ? (
          <p className="text-muted-foreground text-center py-12">טוען...</p>
        ) : events.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <p className="text-5xl">🎉</p>
            <h2 className="text-xl font-semibold">אין עדיין אירועים</h2>
            <p className="text-muted-foreground max-w-sm">
              צור את האירוע הראשון שלך ותתחיל לנהל אורחים, ספקים ועוד.
            </p>
            <Button asChild size="lg" className="mt-2">
              <Link to="/events/new">✦ צור אירוע ראשון</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">האירועים שלי ({total})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onCancel={handleCancel}
                  onPublish={handlePublish}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  הקודם
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  הבא
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
