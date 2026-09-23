import {
  Bath,
  BedDouble,
  CalendarCheck,
  ClipboardPlus,
  Gem,
  Heart,
  HeartPulse,
  ListChecks,
  SearchCheck,
  ShieldCheck,
  Sofa,
  Sparkles,
  Stethoscope,
  Target,
  type LucideIcon,
} from 'lucide-react'

const iconProps = {
  size: 20,
  strokeWidth: 1.65,
  absoluteStrokeWidth: true,
}

const navIcons: Record<string, LucideIcon> = {
  home: Target,
  rooms: BedDouble,
  process: ListChecks,
  packages: Gem,
  amenities: Sparkles,
  why: Heart,
  checkup: Stethoscope,
  request: ClipboardPlus,
  status: SearchCheck,
  appointment: CalendarCheck,
  pulse: HeartPulse,
}

export function NavIcon({ name, size = iconProps.size }: { name: string; size?: number }) {
  const Icon = navIcons[name] ?? Target
  return <Icon {...iconProps} size={size} />
}

const tabIcons: Record<string, LucideIcon> = {
  privacy: ShieldCheck,
  comfort: Sofa,
  safety: Bath,
  family: Heart,
}

export function AmenityTabIcon({ name }: { name: string }) {
  const Icon = tabIcons[name] ?? Sparkles
  return <Icon size={22} strokeWidth={1.65} absoluteStrokeWidth />
}
