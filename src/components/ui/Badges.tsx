import { Crown, Smartphone } from 'lucide-react';

export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`badge badge-premium ${className}`}>
      <Crown size={11} aria-hidden /> Premium
    </span>
  );
}

export function FreeBadge({ className = '' }: { className?: string }) {
  return <span className={`badge badge-free ${className}`}>Free</span>;
}

export function NativeBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`badge badge-native ${className}`}>
      <Smartphone size={11} aria-hidden /> Android App
    </span>
  );
}

export function ToolStatusBadge({ premium, native }: { premium: boolean; native?: boolean }) {
  if (native) return <NativeBadge />;
  return premium ? <PremiumBadge /> : <FreeBadge />;
}
