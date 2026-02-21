import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RsvpSummaryCard } from '@/components/RsvpSummaryCard';
import { AddGuestForm } from '@/components/AddGuestForm';

interface Guest {
  id: string;
  name_hebrew: string;
  name_transliteration?: string;
  phone?: string;
  email?: string;
  rsvp_status: 'pending' | 'confirmed' | 'declined';
  table_number?: number;
  dietary_preference: string;
  dietary_notes?: string;
  whatsapp_link?: string;
}

interface Summary {
  total: string;
  confirmed: string;
  declined: string;
  pending: string;
}

interface CapacityWarning {
  message: string;
  percent: number;
  confirmed: number;
  capacity: number;
}


const DIETARY_LABELS: Record<string, string> = {
  none: 'ללא',
  vegetarian: 'צמחוני',
  vegan: 'טבעוני',
  kosher_regular: 'כשר',
  kosher_mehadrin: 'כשר מהדרין',
};

export function GuestListPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: '0', confirmed: '0', declined: '0', pending: '0' });
  const [warning, setWarning] = useState<CapacityWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    if (!eventId) return;
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/events/${eventId}/guests?${params}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setGuests(data.guests);
      setSummary(data.summary);
      setWarning(data.warning || null);
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [eventId, statusFilter, search]);

  useEffect(() => {
    fetchGuests();
    // Poll every 30 seconds for real-time updates (MVP approach)
    const interval = setInterval(fetchGuests, 30_000);
    return () => clearInterval(interval);
  }, [fetchGuests]);

  async function handleDelete(guestId: string, guestName: string) {
    if (!confirm(`האם למחוק את האורח "${guestName}"? פעולה זו היא סופית.`)) return;
    setDeletingId(guestId);
    try {
      await fetch(`/api/guests/${guestId}`, { method: 'DELETE', credentials: 'include' });
      fetchGuests();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusOverride(guestId: string, newStatus: string) {
    await fetch(`/api/guests/${guestId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsvp_status: newStatus }),
    });
    fetchGuests();
  }

  function handleExport() {
    window.open(`/api/events/${eventId}/guests/export`, '_blank');
  }

  return (
    <div className="min-h-screen bg-muted/40 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">רשימת אורחים</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              ייצוא CSV
            </Button>
          </div>
        </div>

        <RsvpSummaryCard summary={summary} warning={warning} />

        <AddGuestForm eventId={eventId!} onGuestAdded={fetchGuests} />

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="חיפוש לפי שם..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">כל הסטטוסים</option>
            <option value="pending">ממתינים</option>
            <option value="confirmed">מאושרים</option>
            <option value="declined">לא מגיעים</option>
          </Select>
        </div>

        {/* Guest Table */}
        {loading ? (
          <p className="text-muted-foreground">טוען...</p>
        ) : guests.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">אין אורחים עדיין. הוסף את האורח הראשון!</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-right">
                  <th className="px-4 py-3 font-medium">שם</th>
                  <th className="px-4 py-3 font-medium">טלפון</th>
                  <th className="px-4 py-3 font-medium">סטטוס RSVP</th>
                  <th className="px-4 py-3 font-medium">שולחן</th>
                  <th className="px-4 py-3 font-medium">תזונה</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {guests.map(guest => (
                  <tr key={guest.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{guest.name_hebrew}</p>
                      {guest.name_transliteration && (
                        <p className="text-xs text-muted-foreground" dir="ltr">{guest.name_transliteration}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">{guest.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={guest.rsvp_status}
                        onChange={e => handleStatusOverride(guest.id, e.target.value)}
                        className="h-7 text-xs py-0 w-32"
                      >
                        <option value="pending">ממתין</option>
                        <option value="confirmed">מאושר</option>
                        <option value="declined">לא מגיע</option>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-center">{guest.table_number || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={guest.dietary_preference === 'none' ? 'secondary' : 'outline'}>
                        {DIETARY_LABELS[guest.dietary_preference] || guest.dietary_preference}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {guest.whatsapp_link ? (
                        <a
                          href={guest.whatsapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline text-xs"
                        >
                          📲 שלח
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(guest.id, guest.name_hebrew)}
                        disabled={deletingId === guest.id}
                        className="text-destructive hover:text-destructive h-7 px-2"
                      >
                        מחק
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
