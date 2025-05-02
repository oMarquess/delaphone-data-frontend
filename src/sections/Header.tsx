import Image from "next/image";
import LogoIcon from "@/assets/logo-dela.png";
import MenuIcon from "@/assets/icon-menu.svg";
import { Button } from "@/components/Buttons";

export const Header = () => {
  return <header className="py-4 border-b border-white/15 md:border-none sticky top-0 z-20">
     <div className="container relative">
      <div className="flex justify-between items-center md:border border-white/15 md:p-2.5 rounded-xl max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-md -z-10"></div>
        <div className="border h-10 w-10 rounded-lg inline-flex items-center justify-center">
          <Image src={LogoIcon} alt="Dela Logo" width={32} height={32} />
        </div>
        <div className="hidden md:block">
          <nav className="flex gap-8 text-white/70 text-sm">
            <a href="/" className="hover:text-white transition-colors">Features</a>
            <a href="/" className="hover:text-white transition-colors">How It Works</a>
            <a href="/" className="hover:text-white transition-colors">Use Cases</a>
            <a href="/" className="hover:text-white transition-colors">Pricing</a> 
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button>Get for free</Button>
          <MenuIcon className="md:hidden"/>
        </div>
      </div>
     </div>
  </header>;
};
