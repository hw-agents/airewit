import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImportResult {
  imported: number;
  skipped: number;
  warnings: number;
  message: string;
  details: {
    skipped: { row: number; reason: string }[];
    warnings: { row: number; name: string; warning: string }[];
  };
}

interface ImportGuestsFormProps {
  eventId: string;
  onImported: () => void;
}

export function ImportGuestsForm({ eventId, onImported }: ImportGuestsFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!fileRef.current?.files?.length) {
      setError('נא לבחור קובץ');
      return;
    }
    const file = fileRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בייבוא');
      setResult(data);
      onImported();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        ייבוא מ-Excel / CSV
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">ייבוא אורחים מקובץ</CardTitle>
      </CardHeader>
      <CardContent dir="rtl" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          עמודות נדרשות: <span className="font-mono text-xs">name_hebrew, phone</span> (אופציונלי: name_transliteration, email, dietary_preference, relationship_group)
        </p>
        <p className="text-sm text-muted-foreground">פורמטים: CSV (.csv) או Excel (.xlsx, .xls) — עד 500 שורות</p>

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="block w-full text-sm text-muted-foreground file:ml-4 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground file:cursor-pointer"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className={`rounded-md p-3 text-sm ${result.skipped > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="font-medium">{result.message}</p>
            {result.warnings > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-yellow-800">
                {result.details.warnings.map((w, i) => (
                  <li key={i}>שורה {w.row} ({w.name}): {w.warning}</li>
                ))}
              </ul>
            )}
            {result.details.skipped.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-red-800">
                {result.details.skipped.map((s, i) => (
                  <li key={i}>שורה {s.row}: {s.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={loading}>
            {loading ? 'מייבא...' : 'ייבא אורחים'}
          </Button>
          <Button variant="outline" onClick={() => { setOpen(false); setResult(null); setError(''); }}>
            סגור
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
