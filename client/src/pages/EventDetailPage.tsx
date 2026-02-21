import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceChecklist } from '@/components/ComplianceChecklist';
import type { EventSummary } from '@/components/EventCard';

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה', published: 'פורסם', cancelled: 'בוטל', completed: 'הסתיים',
};
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  draft: 'secondary', published: 'success', cancelled: 'destructive', completed: 'outline',
};
const KASHRUT_LABELS: Record<string, string> = {
  none: 'ללא', regular: 'כשר רגיל', mehadrin: 'כשר מהדרין', chalav_yisrael: 'חלב ישראל',
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/events/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setEvent(d.event);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePublish() {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    const data = await res.json();
    if (res.ok) setEvent(data.event);
  }

  async function handleCancel() {
    if (!confirm(`לבטל את האירוע "${event?.title}"?`)) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' });
    navigate('/dashboard');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">טוען...</p></div>;
  if (error || !event) return <div className="min-h-screen flex items-center justify-center"><p className="text-destructive">{error || 'אירוע לא נמצא'}</p></div>;

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('he-IL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Jerusalem',
      })
    : null;

  const daysUntil = event.event_date
    ? Math.ceil((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const showComplianceChecklist = (event.max_guests || 0) >= 100;

  return (
    <div className="min-h-screen bg-muted/40 p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard">← לוח בקרה</Link></Button>
          <div className="flex-1" />
          <div className="flex gap-2">
            {event.status === 'draft' && (
              <>
                <Button size="sm" onClick={handlePublish}>פרסם אירוע</Button>
                <Button asChild size="sm" variant="outline"><Link to={`/events/${id}/edit`}>עריכה</Link></Button>
              </>
            )}
            {event.status === 'published' && (
              <Button asChild size="sm" variant="outline"><Link to={`/events/${id}/edit`}>עריכה</Link></Button>
            )}
            {!['cancelled', 'completed'].includes(event.status) && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleCancel}>
                ביטול אירוע
              </Button>
            )}
          </div>
        </div>

        {/* Main info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-2xl">{event.title}</CardTitle>
              <Badge variant={STATUS_VARIANTS[event.status]}>{STATUS_LABELS[event.status]}</Badge>
            </div>
            {formattedDate && <p className="text-muted-foreground">📅 {formattedDate}</p>}
            {daysUntil !== null && daysUntil > 0 && (
              <p className="text-sm font-medium text-primary">⏳ {daysUntil} ימים עד האירוע</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {event.venue_name && (
              <p>📍 <strong>{event.venue_name}</strong>{event.venue_address ? ` — ${event.venue_address}` : ''}</p>
            )}
            {event.kashrut_level && event.kashrut_level !== 'none' && (
              <p>🕍 כשרות: {KASHRUT_LABELS[event.kashrut_level]}</p>
            )}
            {event.budget && (
              <p>💰 תקציב: ₪{Number(event.budget).toLocaleString('he-IL')}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'מוזמנים', value: `${event.rsvp_total}${event.max_guests ? `/${event.max_guests}` : ''}`, color: '' },
            { label: 'מאושרים', value: event.rsvp_confirmed, color: 'text-green-700' },
            { label: 'ממתינים', value: event.rsvp_pending, color: 'text-yellow-700' },
            { label: 'ספקים מאושרים', value: event.vendors_confirmed, color: 'text-blue-700' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compliance checklist (read-only on detail page) */}
        {showComplianceChecklist && (
          <ComplianceChecklist readOnly />
        )}

        {/* Quick actions */}
        <Card>
          <CardContent className="pt-4 flex gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link to={`/events/${id}/guests`}>ניהול אורחים</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
