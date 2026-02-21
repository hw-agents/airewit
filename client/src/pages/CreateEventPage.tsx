import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceChecklist } from '@/components/ComplianceChecklist';

export function CreateEventPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCompliance, setShowCompliance] = useState(false);
  const [complianceItems, setComplianceItems] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    title: '',
    event_date: '',
    event_time: '18:00',
    venue_name: '',
    venue_address: '',
    description: '',
    max_guests: '',
    venue_capacity: '',
    kashrut_level: 'none',
    noise_curfew_time: '23:00',
    language_pref: 'hebrew',
    budget: '',
  });

  function handleChange(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Show compliance checklist when guest count reaches 100
      if (field === 'max_guests') {
        setShowCompliance(parseInt(value) >= 100);
      }
      return next;
    });
  }

  // Validate date is not in the past
  const minDate = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const eventDatetime = form.event_date && form.event_time
      ? `${form.event_date}T${form.event_time}:00+02:00`
      : form.event_date;

    if (new Date(eventDatetime) < new Date()) {
      setError('לא ניתן ליצור אירוע בתאריך עבר');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          event_date: eventDatetime,
          venue_name: form.venue_name,
          venue_address: form.venue_address || undefined,
          description: form.description || undefined,
          max_guests: form.max_guests ? parseInt(form.max_guests) : undefined,
          venue_capacity: form.venue_capacity ? parseInt(form.venue_capacity) : undefined,
          kashrut_level: form.kashrut_level,
          noise_curfew_time: form.noise_curfew_time,
          language_pref: form.language_pref,
          budget: form.budget ? parseFloat(form.budget) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת האירוע');

      navigate(`/events/${data.event.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">← חזרה</Link>
          </Button>
          <h1 className="text-2xl font-bold">יצירת אירוע חדש</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>פרטי האירוע</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">שם האירוע *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="חתונת יוסי ומיכל"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="event_date">תאריך האירוע *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={form.event_date}
                    onChange={e => handleChange('event_date', e.target.value)}
                    min={minDate}
                    required
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="event_time">שעת התחלה</Label>
                  <Input
                    id="event_time"
                    type="time"
                    value={form.event_time}
                    onChange={e => handleChange('event_time', e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="venue_name">שם המקום *</Label>
                <Input
                  id="venue_name"
                  value={form.venue_name}
                  onChange={e => handleChange('venue_name', e.target.value)}
                  placeholder="אולם הנשיאים"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="venue_address">כתובת המקום</Label>
                <Input
                  id="venue_address"
                  value={form.venue_address}
                  onChange={e => handleChange('venue_address', e.target.value)}
                  placeholder="רחוב הרצל 1, תל אביב"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">תיאור</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="תיאור האירוע..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="max_guests">מספר אורחים מקסימלי</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={form.max_guests}
                    onChange={e => handleChange('max_guests', e.target.value)}
                    placeholder="150"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="venue_capacity">קיבולת האולם</Label>
                  <Input
                    id="venue_capacity"
                    type="number"
                    min="1"
                    value={form.venue_capacity}
                    onChange={e => handleChange('venue_capacity', e.target.value)}
                    placeholder="200"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="kashrut_level">רמת כשרות</Label>
                  <Select
                    id="kashrut_level"
                    value={form.kashrut_level}
                    onChange={e => handleChange('kashrut_level', e.target.value)}
                  >
                    <option value="none">ללא</option>
                    <option value="regular">כשר רגיל</option>
                    <option value="mehadrin">כשר מהדרין</option>
                    <option value="chalav_yisrael">חלב ישראל</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="budget">תקציב (₪)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={e => handleChange('budget', e.target.value)}
                    placeholder="50000"
                    dir="ltr"
                  />
                </div>
              </div>

              {showCompliance && (
                <ComplianceChecklist
                  onDismiss={() => setShowCompliance(false)}
                  checkedItems={complianceItems}
                  onItemChange={(key, checked) => setComplianceItems(prev => ({ ...prev, [key]: checked }))}
                />
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'יוצר...' : 'צור אירוע'}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link to="/dashboard">ביטול</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
