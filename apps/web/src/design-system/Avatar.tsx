import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

const SIZES = {
  xs: 'h-6 w-6 text-label',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
} as const;

/** Paleta de fundos derivada do nome — estavel entre sessoes, sem armazenar nada. */
const PALETTE = [
  ['#7B2E3A', '#F7F1E5'],
  ['#B0822A', '#221F1B'],
  ['#2E694A', '#F7F1E5'],
  ['#4A5C7A', '#F7F1E5'],
  ['#8A5A3B', '#F7F1E5'],
  ['#5C4A7A', '#F7F1E5'],
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}

export function Avatar({ name, src, size = 'md', className, ring }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const [bg, fg] = useMemo(() => PALETTE[hash(name) % PALETTE.length]!, [name]);

  const showImage = src && !failed;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        SIZES[size],
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={showImage ? undefined : { background: bg, color: fg }}
      title={name}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

/** Pilha de avatares usada em "8 pessoas lendo este livro". */
export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
}: {
  people: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((person, i) => (
          <Avatar key={`${person.name}-${i}`} name={person.name} src={person.avatarUrl} size={size} ring />
        ))}
      </div>
      {rest > 0 && <span className="ml-2 text-xs font-medium text-muted">+{rest}</span>}
    </div>
  );
}
