import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Summary {
  total: string | number;
  confirmed: string | number;
  declined: string | number;
  pending: string | number;
}

interface CapacityWarning {
  message: string;
  percent: number;
  confirmed: number;
  capacity: number;
}

interface RsvpSummaryCardProps {
  summary: Summary;
  warning?: CapacityWarning | null;
}

export function RsvpSummaryCard({ summary, warning }: RsvpSummaryCardProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ מוזמנים</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-green-700">מאושרים</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-green-700">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-red-700">לא מגיעים</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-red-700">{summary.declined}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-yellow-700">ממתינים</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-700">{summary.pending}</p>
          </CardContent>
        </Card>
      </div>

      {warning && (
        <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800" dir="rtl">
          ⚠️ {warning.message}
        </div>
      )}
    </div>
  );
}
