import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RsvpData {
  guest: {
    id: string;
    name_hebrew: string;
    name_transliteration?: string;
    rsvp_status: string;
    dietary_preference: string;
    dietary_notes?: string;
  };
  event: {
    id: string;
    title: string;
    event_date?: string;
    venue_name?: string;
    venue_address?: string;
    kashrut_level?: string;
  };
}

const KASHRUT_LABELS: Record<string, string> = {
  none: '',
  regular: 'כשר',
  mehadrin: 'כשר מהדרין',
  chalav_yisrael: 'חלב ישראל',
};

const DIETARY_LABELS: Record<string, string> = {
  none: 'ללא הגבלה',
  vegetarian: 'צמחוני',
  vegan: 'טבעוני',
  kosher_regular: 'כשר',
  kosher_mehadrin: 'כשר מהדרין',
};

export function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<RsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [dietary_preference, setDietaryPreference] = useState('');
  const [dietary_notes, setDietaryNotes] = useState('');

  useEffect(() => {
    fetch(`/api/rsvp/${token}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setDietaryPreference(d.guest.dietary_preference || 'none');
        setDietaryNotes(d.guest.dietary_notes || '');
        if (d.guest.rsvp_status !== 'pending') setSubmitted(true);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRsvp(status: 'confirmed' | 'declined') {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsvp_status: status, dietary_preference, dietary_notes }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'שגיאה בעדכון');
      setData(prev => prev ? {
        ...prev,
        guest: { ...prev.guest, rsvp_status: status },
      } : prev);
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">טוען הזמנה...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <p className="text-destructive text-lg">{error}</p>
            <p className="text-muted-foreground mt-2 text-sm">ייתכן שהקישור אינו תקין או פג תוקפו.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { guest, event } = data!;
  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('he-IL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center" dir="rtl">
          <CardTitle className="text-2xl">{event.title}</CardTitle>
          {formattedDate && <CardDescription>{formattedDate}</CardDescription>}
          {event.venue_name && (
            <CardDescription>{event.venue_name}{event.venue_address ? ` — ${event.venue_address}` : ''}</CardDescription>
          )}
          {event.kashrut_level && event.kashrut_level !== 'none' && (
            <CardDescription className="text-xs">🕍 {KASHRUT_LABELS[event.kashrut_level]}</CardDescription>
          )}
        </CardHeader>

        <CardContent dir="rtl" className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <p className="font-medium text-lg">{guest.name_hebrew}</p>
            {guest.name_transliteration && (
              <p className="text-sm text-muted-foreground" dir="ltr">{guest.name_transliteration}</p>
            )}
          </div>

          {submitted ? (
            <div className="text-center py-4 space-y-2">
              {guest.rsvp_status === 'confirmed' ? (
                <>
                  <p className="text-3xl">🎉</p>
                  <p className="font-semibold text-green-700 text-lg">אישרת הגעה!</p>
                  <p className="text-muted-foreground text-sm">תודה! נתראה באירוע.</p>
                </>
              ) : (
                <>
                  <p className="text-3xl">🙏</p>
                  <p className="font-semibold text-lg">תשובתך נרשמה</p>
                  <p className="text-muted-foreground text-sm">תודה על העדכון.</p>
                </>
              )}
              {guest.rsvp_status === 'pending' && (
                <Button variant="outline" className="mt-2" onClick={() => setSubmitted(false)}>
                  שנה תשובה
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center font-medium">האם אתה מגיע לאירוע?</p>

              <div className="space-y-2">
                <Label htmlFor="dietary">העדפה תזונתית</Label>
                <Select
                  id="dietary"
                  value={dietary_preference}
                  onChange={e => setDietaryPreference(e.target.value)}
                >
                  {Object.entries(DIETARY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות נוספות (אופציונלי)</Label>
                <Input
                  id="notes"
                  value={dietary_notes}
                  onChange={e => setDietaryNotes(e.target.value)}
                  placeholder="אלרגיות, דרישות מיוחדות..."
                />
              </div>

              {submitError && <p className="text-sm text-destructive text-center">{submitError}</p>}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => handleRsvp('confirmed')}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✓ אני מגיע/ה
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRsvp('declined')}
                  disabled={submitting}
                >
                  ✗ לא אוכל להגיע
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
