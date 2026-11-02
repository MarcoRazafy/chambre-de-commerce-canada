import { IC } from '@/lib/icons';

export default function Icon({ name, size = 17 }: { name: string; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: IC[name] ?? '' }} />;
}
