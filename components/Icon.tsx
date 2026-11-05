// Icônes Phosphor (trait fin), utilisables côté serveur comme côté client
import {
  AddressBook, Archive, ArrowBendDownLeft, ArrowLeft, ArrowsOut, Bell, Briefcase, DotsThree, DownloadSimple, FileText, Image as ImageIcon, Info, Minus, NotePencil, Paperclip, PencilSimple, SignOut, Smiley, Star, Trash, UsersThree, VideoCamera, CheckCircle, MinusCircle, PlusCircle, X, CaretDown, CaretUp, SidebarSimple, Storefront, CalendarBlank, CalendarCheck, ChatCircle, ClockCounterClockwise, Clock, Coins,
  CreditCard, EnvelopeSimple, Folder, GearSix, Handshake, IdentificationCard, List, MagnifyingGlass, Newspaper,
  FolderLock, FolderPlus, FolderOpen, Copy, Scissors, ClipboardText, ArrowUp, ArrowDown, DotsSixVertical, TextAlignLeft, TextAlignCenter, TextAlignRight,
  TextB, TextItalic, TextUnderline, LinkSimple, ListBullets, ListNumbers, TextH, TextT, Palette, Eye, Books, Rows, Lock, CaretRight, UploadSimple,
  FilePdf, FileDoc, FileVideo, FileImage, Article, ArrowLineUp, ArrowLineDown, CheckSquare, ArrowSquareOut,
  MapPin, PaperPlaneTilt, Play, ShareFat, ThumbsUp, User, Plus, Receipt, ShieldCheck, SquaresFour, Tag, UserList, UserPlus, Users, WarningCircle,
} from '@phosphor-icons/react/ssr';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

const ICONS: Record<string, PhosphorIcon> = {
  dash: SquaresFour, log: ClockCounterClockwise, team: ShieldCheck, users: Users, book: AddressBook,
  cal: CalendarBlank, agenda: CalendarCheck, clock: Clock, news: Newspaper, folder: Folder, gift: Briefcase,
  chat: ChatCircle, mail: EnvelopeSimple, list: UserList, file: Receipt, coin: Coins, gear: GearSix,
  star: CreditCard, spark: Handshake, send: PaperPlaneTilt, bell: Bell, plus: Plus, userplus: UserPlus,
  alert: WarningCircle, card: IdentificationCard, tag: Tag, menu: List, search: MagnifyingGlass,
  ok: CheckCircle, new: PlusCircle, minus: MinusCircle, close: X,
  compose: NotePencil, fav: Star, info: Info, image: ImageIcon, video: VideoCamera, attach: Paperclip, smile: Smiley, more: DotsThree,
  minimize: Minus, open: ArrowsOut, back: ArrowLeft, archive: Archive, trash: Trash, doc: FileText, download: DownloadSimple,
  inbound: ArrowBendDownLeft, group: UsersThree, edit: PencilSimple, logout: SignOut,
  down: CaretDown, up: CaretUp, sidebar: SidebarSimple, store: Storefront,
  folderlock: FolderLock, folderplus: FolderPlus, folderopen: FolderOpen, copy: Copy, cut: Scissors, paste: ClipboardText,
  arrowup: ArrowUp, arrowdown: ArrowDown, grip: DotsSixVertical, alignleft: TextAlignLeft, aligncenter: TextAlignCenter, alignright: TextAlignRight,
  bold: TextB, italic: TextItalic, underline: TextUnderline, link: LinkSimple, ul: ListBullets, ol: ListNumbers, heading: TextH, text: TextT,
  palette: Palette, eye: Eye, books: Books, rows: Rows, lock: Lock, caret: CaretRight, upload: UploadSimple,
  pdf: FilePdf, docx: FileDoc, filevideo: FileVideo, fileimage: FileImage, article: Article, first: ArrowLineUp, last: ArrowLineDown,
  checks: CheckSquare, external: ArrowSquareOut,
  user: User, pin: MapPin, like: ThumbsUp, play: Play, share: ShareFat,
};

// Bouton du menu latéral, dessiné comme celui de GoDaddy : un panneau avec sa colonne, et une flèche
// vers la gauche pour replier (collapse) ou vers la droite pour déplier (expand)
function PanelIcon({ dir, size }: { dir: 'left' | 'right'; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
      <path d={dir === 'left' ? 'M16 9.5 13.5 12l2.5 2.5' : 'M13.5 9.5 16 12l-2.5 2.5'} />
    </svg>
  );
}

export default function Icon({ name, size = 18, fill, bold }: { name: string; size?: number; fill?: boolean; bold?: boolean }) {
  if (name === 'collapse' || name === 'expand') return <PanelIcon dir={name === 'collapse' ? 'left' : 'right'} size={size} />;
  const C = ICONS[name] ?? SquaresFour;
  return <C size={size} weight={fill ? 'fill' : bold ? 'bold' : 'regular'} aria-hidden="true" />;
}
