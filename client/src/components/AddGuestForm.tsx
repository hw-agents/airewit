import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AddGuestFormProps {
  eventId: string;
  onGuestAdded: () => void;
}

export function AddGuestForm({ eventId, onGuestAdded }: AddGuestFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  const [form, setForm] = useState({
    name_hebrew: '',
    name_transliteration: '',
    phone: '',
    email: '',
    relationship_group: '',
    dietary_preference: 'none',
    dietary_notes: '',
    table_number: '',
    plus_one_allowance: '0',
  });

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setWhatsappLink('');
    setLoading(true);

    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          table_number: form.table_number ? parseInt(form.table_number) : null,
          plus_one_allowance: parseInt(form.plus_one_allowance) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בהוספת אורח');

      setWhatsappLink(data.whatsapp_link || '');

      // Reset form
      setForm({
        name_hebrew: '', name_transliteration: '', phone: '', email: '',
        relationship_group: '', dietary_preference: 'none',
        dietary_notes: '', table_number: '', plus_one_allowance: '0',
      });

      onGuestAdded();

      if (!data.whatsapp_link) setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת אורח');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ הוסף אורח</Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">הוספת אורח חדש</CardTitle>
      </CardHeader>
      <CardContent>
        {whatsappLink && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm" dir="rtl">
            <p className="font-medium text-green-800 mb-2">האורח נוסף! שלח הזמנה ב-WhatsApp:</p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-green-600 px-3 py-1.5 text-white text-sm hover:bg-green-700"
            >
              📲 פתח WhatsApp לשליחה
            </a>
            <Button variant="ghost" size="sm" className="mr-2" onClick={() => { setWhatsappLink(''); setOpen(false); }}>
              סגור
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} dir="rtl" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name_hebrew">שם בעברית *</Label>
              <Input
                id="name_hebrew"
                value={form.name_hebrew}
                onChange={e => handleChange('name_hebrew', e.target.value)}
                placeholder="ישראל ישראלי"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name_transliteration">שם באנגלית</Label>
              <Input
                id="name_transliteration"
                value={form.name_transliteration}
                onChange={e => handleChange('name_transliteration', e.target.value)}
                placeholder="Israel Israeli"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">טלפון (WhatsApp)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="050-1234567"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="guest@email.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="relationship_group">קבוצת יחסים</Label>
              <Select
                id="relationship_group"
                value={form.relationship_group}
                onChange={e => handleChange('relationship_group', e.target.value)}
              >
                <option value="">-- בחר --</option>
                <option value="family_bride">משפחת כלה</option>
                <option value="family_groom">משפחת חתן</option>
                <option value="friends">חברים</option>
                <option value="work">עבודה</option>
                <option value="community">קהילה</option>
                <option value="other">אחר</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dietary_preference">העדפה תזונתית</Label>
              <Select
                id="dietary_preference"
                value={form.dietary_preference}
                onChange={e => handleChange('dietary_preference', e.target.value)}
              >
                <option value="none">ללא הגבלה</option>
                <option value="vegetarian">צמחוני</option>
                <option value="vegan">טבעוני</option>
                <option value="kosher_regular">כשר רגיל</option>
                <option value="kosher_mehadrin">כשר מהדרין</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="table_number">מספר שולחן</Label>
              <Input
                id="table_number"
                type="number"
                value={form.table_number}
                onChange={e => handleChange('table_number', e.target.value)}
                placeholder="1"
                min="1"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plus_one_allowance">מלווים מורשים</Label>
              <Input
                id="plus_one_allowance"
                type="number"
                value={form.plus_one_allowance}
                onChange={e => handleChange('plus_one_allowance', e.target.value)}
                min="0"
                max="10"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dietary_notes">הערות תזונה / נגישות</Label>
            <Input
              id="dietary_notes"
              value={form.dietary_notes}
              onChange={e => handleChange('dietary_notes', e.target.value)}
              placeholder="אלרגיה לבוטנים, כסא גלגלים..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'מוסיף...' : 'הוסף אורח'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
