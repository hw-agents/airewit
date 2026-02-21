import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ComplianceChecklistProps {
  onDismiss?: () => void;
  readOnly?: boolean;
  checkedItems?: Record<string, boolean>;
  onItemChange?: (key: string, checked: boolean) => void;
}

const CHECKLIST_ITEMS = [
  { key: 'municipal_permit', label: 'אישור עירייה התקבל (נדרש על פי חוק לאירועים עם 100+ אורחים)' },
  { key: 'fire_safety', label: 'תעודת בטיחות אש של המקום התקבלה' },
  { key: 'liability_insurance', label: 'ביטוח אחריות לאירוע בתוקף' },
  { key: 'noise_curfew', label: 'עוצר הרעש הובן — האירוע יסתיים עד 23:00 בהתאם לתקנות' },
];

export function ComplianceChecklist({ onDismiss, readOnly = false, checkedItems = {}, onItemChange }: ComplianceChecklistProps) {
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>(checkedItems);

  function handleCheck(key: string, checked: boolean) {
    setLocalChecked(prev => ({ ...prev, [key]: checked }));
    onItemChange?.(key, checked);
  }

  const items = readOnly ? checkedItems : localChecked;
  const allChecked = CHECKLIST_ITEMS.every(item => items[item.key]);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between" dir="rtl">
          <CardTitle className="text-base text-blue-800">
            📋 רשימת ציות לאירועים עם 100+ אורחים
          </CardTitle>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-blue-600 h-6 px-2">
              ✕
            </Button>
          )}
        </div>
        <p className="text-xs text-blue-600 text-right">
          אלו דרישות חוקיות — המארגן מאשר בעצמו. המערכת אינה מאמתת.
        </p>
      </CardHeader>
      <CardContent dir="rtl">
        <ul className="space-y-2">
          {CHECKLIST_ITEMS.map(item => (
            <li key={item.key} className="flex items-start gap-2">
              {readOnly ? (
                <span className={`mt-0.5 flex-shrink-0 text-lg leading-none ${items[item.key] ? 'text-green-600' : 'text-gray-300'}`}>
                  {items[item.key] ? '✓' : '○'}
                </span>
              ) : (
                <input
                  type="checkbox"
                  id={item.key}
                  checked={!!localChecked[item.key]}
                  onChange={e => handleCheck(item.key, e.target.checked)}
                  className="mt-1 flex-shrink-0 h-4 w-4 accent-blue-600"
                />
              )}
              <label htmlFor={readOnly ? undefined : item.key} className="text-sm text-blue-900 leading-snug cursor-pointer">
                {item.label}
              </label>
            </li>
          ))}
        </ul>
        {!readOnly && allChecked && (
          <p className="mt-3 text-sm font-medium text-green-700">✓ כל הפריטים סומנו</p>
        )}
      </CardContent>
    </Card>
  );
}
