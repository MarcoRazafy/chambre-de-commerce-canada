// Icônes Phosphor (trait fin), utilisables côté serveur comme côté client
import {
  AddressBook, Bell, Briefcase, CaretDown, CaretUp, SidebarSimple, Storefront, CalendarBlank, CalendarCheck, ChatCircle, ClockCounterClockwise, Clock, Coins,
  CreditCard, EnvelopeSimple, Folder, GearSix, Handshake, IdentificationCard, List, MagnifyingGlass, Newspaper,
  PaperPlaneTilt, Plus, Receipt, ShieldCheck, SquaresFour, Tag, UserList, UserPlus, Users, WarningCircle,
} from '@phosphor-icons/react/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

const ICONS: Record<string, PhosphorIcon> = {
  dash: SquaresFour, log: ClockCounterClockwise, team: ShieldCheck, users: Users, book: AddressBook,
  cal: CalendarBlank, agenda: CalendarCheck, clock: Clock, news: Newspaper, folder: Folder, gift: Briefcase,
  chat: ChatCircle, mail: EnvelopeSimple, list: UserList, file: Receipt, coin: Coins, gear: GearSix,
  star: CreditCard, spark: Handshake, send: PaperPlaneTilt, bell: Bell, plus: Plus, userplus: UserPlus,
  alert: WarningCircle, card: IdentificationCard, tag: Tag, menu: List, search: MagnifyingGlass,
  down: CaretDown, up: CaretUp, sidebar: SidebarSimple, store: Storefront,
};

export default function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const C = ICONS[name] ?? SquaresFour;
  return <C size={size} weight="regular" aria-hidden="true" />;
}
