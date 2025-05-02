'use client';
import { Button } from "@/components/Buttons";
import starsBg from "@/assets/stars.png";
import gridLines from "@/assets/grid-lines.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export const CallToAction = () => {
  const sectionRef = useRef(null);
  const {scrollYProgress} = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });
  
  // Create parallax effect for background position
  const backgroundPositionY = useTransform(scrollYProgress, [0,1], [0, -100]);
  
  return <section className="pt-24 pb-15 md:py-24 relative">
    {/* Top blend gradient to smoothly transition from previous section */}
    <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-gray-900 via-gray-900/90 to-transparent z-10"></div>
    
    <div className="px-0 max-w-none overflow-hidden">
      <motion.div 
        ref={sectionRef}
        className="relative overflow-hidden py-24" 
        animate={{backgroundPositionX: starsBg.width}}
        style={{
          backgroundImage: `url(${starsBg.src})`, 
          backgroundSize: 'cover',
          backgroundPositionY
        }}
        transition={{
          repeat: Infinity,
          repeatType: 'loop',
          duration: 30, // slower than Hero's 120
          ease: 'linear'
        }}
      >
        {/* <div className="absolute inset-0 bg-[rgb(74,32,138)] opacity-70 mix-blend-overlay" style={{backgroundImage: `url(${gridLines.src})`, backgroundSize: 'cover'}}></div> */}
        
        {/* Enhanced radial gradient that extends further up */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_50%,rgba(140,69,255,0.35),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(50%_30%_at_50%_35%,rgba(140,69,255,0.5),transparent)]"></div>
        
        {/* Edge gradient masks with increased width on right side */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-gray-900/60 to-transparent"></div>
        <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-gray-900/75 to-transparent"></div>
        
        {/* Top shadow for soft transition */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900/50 to-transparent"></div>
        
        <div className="relative z-10 container">
          <h2 className="text-5xl md:text-6xl max-w-sm mx-auto text-white tracking-tighter text-center font-medium">Book Your Demo</h2>
          <p className="text-center text-lg md:text-xl max-w-xs mx-auto text-white/70 tracking-tight px-4 mt-5">Get a personalized walkthrough.</p>
          <div className="flex justify-center mt-10">
            <Button>Book a Demo</Button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>;
};
