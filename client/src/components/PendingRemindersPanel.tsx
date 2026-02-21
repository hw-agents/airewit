import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Reminder {
  id: string;
  name_hebrew: string;
  name_transliteration?: string;
  phone?: string;
  whatsapp_link: string;
  days_until: number;
}

interface PendingRemindersPanelProps {
  eventId: string;
  refreshTrigger: number;
}

export function PendingRemindersPanel({ eventId, refreshTrigger }: PendingRemindersPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/guests/reminders`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setReminders(d.reminders || []))
      .catch(() => {});
  }, [eventId, refreshTrigger]);

  if (reminders.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-orange-800" dir="rtl">
          🔔 תזכורות ממתינות ({reminders.length})
        </CardTitle>
      </CardHeader>
      <CardContent dir="rtl">
        <p className="text-sm text-orange-700 mb-3">
          האורחים הבאים עדיין לא אישרו הגעה. לחץ על הקישור לשלוח תזכורת ב-WhatsApp.
        </p>
        <ul className="space-y-2">
          {reminders.map(r => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded bg-white px-3 py-2 text-sm shadow-sm">
              <div>
                <span className="font-medium">{r.name_hebrew}</span>
                {r.name_transliteration && (
                  <span className="text-xs text-muted-foreground mr-2" dir="ltr">{r.name_transliteration}</span>
                )}
                <span className="text-xs text-orange-600 mr-2">({r.days_until} ימים לאירוע)</span>
              </div>
              <a
                href={r.whatsapp_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
              >
                📲 שלח תזכורת
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
