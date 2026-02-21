import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'organizer' | 'vendor'>('organizer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Inline validation
  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'כתובת אימייל לא תקינה' : '';
  const passwordError = password && password.length < 8 ? 'הסיסמה חייבת להכיל לפחות 8 תווים' : '';
  const nameError = displayName && displayName.trim().length === 0 ? 'שם תצוגה הוא שדה חובה' : '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (emailError || passwordError || nameError) return;
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName, role);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">אירועית</CardTitle>
          <CardDescription>יצירת חשבון חדש</CardDescription>
        </CardHeader>

        <CardContent>
          {/* RTL form for Hebrew UI */}
          <form onSubmit={handleSubmit} dir="rtl" className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">שם תצוגה</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="ישראל ישראלי"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
              {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                dir="ltr"
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="מינימום 8 תווים"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                dir="ltr"
              />
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            </div>

            <div className="space-y-1">
              <Label>סוג חשבון</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRole('organizer')}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    role === 'organizer'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-muted'
                  }`}
                >
                  מארגן אירוע
                </button>
                <button
                  type="button"
                  onClick={() => setRole('vendor')}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    role === 'vendor'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-muted'
                  }`}
                >
                  ספק שירותים
                </button>
              </div>
            </div>

            {/* Israeli Privacy Law disclosure */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              בהרשמה אתה מסכים לאיסוף ועיבוד הנתונים שלך בהתאם לחוק הגנת הפרטיות הישראלי 2023.
              המידע שנאסף: שם, אימייל, וסיסמה מוצפנת.
            </p>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !!emailError || !!passwordError || !!nameError}
            >
              {loading ? 'נרשם...' : 'הרשמה'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground" dir="rtl">
            יש לך כבר חשבון?{' '}
            <Link to="/login" className="text-primary underline underline-offset-4 hover:opacity-80">
              כניסה
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
