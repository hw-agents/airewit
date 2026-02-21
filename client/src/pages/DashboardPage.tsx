import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen bg-muted/40 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">אירועית</h1>
          <Button variant="outline" onClick={handleLogout}>
            התנתקות
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ברוך הבא, {user?.display_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {user?.role === 'organizer' ? 'מארגן אירועים' : 'ספק שירותים'} • {user?.email}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              הלוח הראשי של {user?.role === 'organizer' ? 'האירועים' : 'הפרופיל'} שלך יוצג כאן בקרוב.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
