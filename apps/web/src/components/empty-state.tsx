import { Inbox } from 'lucide-react';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Inbox className="w-8 h-8 mb-2 text-gray-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
