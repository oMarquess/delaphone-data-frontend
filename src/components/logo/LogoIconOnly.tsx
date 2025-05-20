import Link from 'next/link';
import Image from 'next/image';

export default function LogoIconOnly() {
  return (
    <Link href="/dashboard" className="flex items-center">
      <Image 
        src="/assets/dlp-logo.png" 
        alt="Delaphone Logo" 
        width={32} 
        height={32}
        priority
      />
    </Link>
  );
} 