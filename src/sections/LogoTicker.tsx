'use client'
import OldmutualLogo from "@/assets/OldMutual-removebg-preview.png";
import UnitedPensionsLogo from "@/assets/united-pensions-logo.png";
import StarBitesLogo from "@/assets/starbites.png";
import {motion} from "framer-motion";

export const LogoTicker = () => {
  return <section className="py-20 md:py-24">
    <div className="container">
      <div className="flex items-center gap-5">
        <div className="flex-1 md:flex-none">
          <h2 className="font-medium"> Powering Industry Leaders: </h2>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900 z-10 pointer-events-none"></div>
          <motion.div 
          initial={{translateX: '-50%'}}
          animate={{translateX: '0%'}}
          transition={{
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
            duration: 30,
            
          }}
          className="flex flex-none gap-14 pr-14 -translate-x-1/2">
            {[OldmutualLogo, StarBitesLogo, OldmutualLogo, StarBitesLogo, OldmutualLogo, StarBitesLogo, OldmutualLogo, StarBitesLogo, OldmutualLogo, StarBitesLogo].map((logo, index) => (
              <img key={`${logo.src}-${index}`} src={logo.src} alt={`Partner logo ${index + 1}`} className="h-6 w-auto" />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  </section>;
};
