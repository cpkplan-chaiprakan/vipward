export type NavItem = {
  href: string
  label: string
  icon: string
}

export type RoomType = {
  id: string
  name: string
  category: string
  description: string
  swatch: string
  tag?: string
}

export type ProcessStep = {
  num: string
  title: string
  text: string
}

export type RoomPackage = {
  id: string
  name: string
  description: string
  label: string
  details: string[]
  price: string
  priceNote: string
  tone: 'standard' | 'premium' | 'suite'
}

export type AmenityPanel = {
  id: string
  tabLabel: string
  tabIcon: string
  badge: string
  seasonLabel: string
  name: string
  description: string
  tags: { icon: string; text: string }[]
  tone: string
}

export type Perk = {
  title: string
  text: string
}

export type SiteContent = {
  hospital: {
    shortName: string
    name: string
    englishName: string
    tagline: string
    address: string
    addressEn: string
    phone: string
    phoneHref: string
    fax: string
    faxHref: string
    email: string
    facebook: string
    line: string
    tiktok: string
    maps: string
    website: string
    hours: string[]
  }
  nav: NavItem[]
  rooms: RoomType[]
  roomsAlt: RoomType[]
  steps: ProcessStep[]
  packages: RoomPackage[]
  amenities: AmenityPanel[]
  perks: Perk[]
  rights: { label: string; filled: boolean; reward?: boolean }[]
}
