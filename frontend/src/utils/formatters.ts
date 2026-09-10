export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

export function getRiskBadgeClasses(level: string): string {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-950/80 text-red-400 border border-red-800/80';
    case 'HIGH':
      return 'bg-amber-950/80 text-amber-400 border border-amber-800/80';
    case 'MEDIUM':
      return 'bg-yellow-950/80 text-yellow-400 border border-yellow-800/80';
    case 'LOW':
    default:
      return 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80';
  }
}

export function getStatusBadgeClasses(status: string): string {
  switch (status?.toUpperCase()) {
    case 'ESCALATED':
    case 'CRITICAL':
      return 'bg-red-900/60 text-red-300 border border-red-700/60';
    case 'UNDER_REVIEW':
    case 'IN_REVIEW':
    case 'OPEN':
      return 'bg-blue-900/60 text-blue-300 border border-blue-700/60';
    case 'CLOSED':
    case 'DISMISSED':
      return 'bg-gray-800 text-gray-400 border border-gray-700';
    case 'NEW':
    default:
      return 'bg-purple-900/60 text-purple-300 border border-purple-700/60';
  }
}
