import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface EventSummary {
  id: string;
  title: string;
  event_date?: string;
  venue_name?: string;
  venue_address?: string;
  max_guests?: number;
  venue_capacity?: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  rsvp_confirmed: number;
  rsvp_pending: number;
  rsvp_total: number;
  vendors_confirmed: number;
  kashrut_level?: string;
  budget?: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  published: 'פורסם',
  cancelled: 'בוטל',
  completed: 'הסתיים',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  draft: 'secondary',
  published: 'success',
  cancelled: 'destructive',
  completed: 'outline',
};

interface EventCardProps {
  event: EventSummary;
  onCancel: (id: string, title: string) => void;
  onPublish: (id: string) => void;
}

export function EventCard({ event, onCancel, onPublish }: EventCardProps) {
  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('he-IL', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'Asia/Jerusalem',
      })
    : null;

  const daysUntil = event.event_date
    ? Math.ceil((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const rsvpPercent = event.max_guests && event.rsvp_total > 0
    ? Math.round((event.rsvp_confirmed / event.max_guests) * 100)
    : null;

  return (
    <Card className={`transition-shadow hover:shadow-md ${event.status === 'cancelled' ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2" dir="rtl">
          <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
          <Badge variant={STATUS_VARIANTS[event.status]} className="flex-shrink-0">
            {STATUS_LABELS[event.status]}
          </Badge>
        </div>
        {formattedDate && (
          <p className="text-sm text-muted-foreground" dir="rtl">
            📅 {formattedDate}
            {daysUntil !== null && daysUntil > 0 && (
              <span className="mr-2 text-xs font-medium text-primary">({daysUntil} ימים)</span>
            )}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-2 text-sm" dir="rtl">
        {event.venue_name && (
          <p className="text-muted-foreground">📍 {event.venue_name}{event.venue_address ? `, ${event.venue_address}` : ''}</p>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-md bg-muted px-2 py-1.5 text-center">
            <p className="text-xs text-muted-foreground">מאושרים</p>
            <p className="font-bold text-green-700">{event.rsvp_confirmed}</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-1.5 text-center">
            <p className="text-xs text-muted-foreground">מוזמנים</p>
            <p className="font-bold">{event.rsvp_total}{event.max_guests ? `/${event.max_guests}` : ''}</p>
          </div>
          <div className="rounded-md bg-muted px-2 py-1.5 text-center">
            <p className="text-xs text-muted-foreground">ספקים</p>
            <p className="font-bold text-blue-700">{event.vendors_confirmed}</p>
          </div>
        </div>

        {rsvpPercent !== null && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${rsvpPercent >= 90 ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(rsvpPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{rsvpPercent}% אישרו הגעה</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-0 flex-wrap" dir="rtl">
        <Button asChild size="sm" variant="outline">
          <Link to={`/events/${event.id}`}>פרטים</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/events/${event.id}/guests`}>אורחים</Link>
        </Button>
        {event.status === 'draft' && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link to={`/events/${event.id}/edit`}>עריכה</Link>
            </Button>
            <Button size="sm" onClick={() => onPublish(event.id)}>
              פרסם
            </Button>
          </>
        )}
        {event.status === 'published' && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/events/${event.id}/edit`}>עריכה</Link>
          </Button>
        )}
        {!['cancelled', 'completed'].includes(event.status) && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onCancel(event.id, event.title)}
          >
            ביטול
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
