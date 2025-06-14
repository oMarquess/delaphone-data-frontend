import Link from 'next/link';
import Image from 'next/image';

export default function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center">
      <Image 
        src="/assets/dlp-logo.png" 
        alt="Dlp Logo" 
        width={28} 
        height={28}
      />
    </Link>
  );
} 