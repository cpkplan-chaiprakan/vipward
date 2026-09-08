import {
  Bath,
  BedDouble,
  Gem,
  Heart,
  ListChecks,
  ShieldCheck,
  Sofa,
  Sparkles,
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
}

export function NavIcon({ name }: { name: string }) {
  const Icon = navIcons[name] ?? Target
  return <Icon {...iconProps} />
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
