"use client";
import { Button } from "@/components/Buttons";
import starsBg from "@/assets/stars.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useRouter } from 'next/navigation';

export const Hero = () => {
  const router = useRouter();
  const sectionRef = useRef(null);
  const {scrollYProgress} = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });
  const backgroundPositionY = useTransform(scrollYProgress, [0,1], [0, -300])
  return <motion.section 
    ref={sectionRef}
    animate={{backgroundPositionX: starsBg.width}}
    style={{ backgroundImage: `url(${starsBg.src})` , backgroundPositionY}}
    
    transition={{
      repeat: Infinity,
      repeatType: 'loop',
      duration: 120,
      ease: 'linear'
    }}
    className="h-[592px] md:h[800px] flex items-center overflow-hidden relative [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
    <div className="absolute inset-0 bg-[radial-gradient(75%_75%_at_center_center, rgb(140, 69, 255, .5)_15%, rgb(14,0,36,.5)_78%, transparent)]"></div>
    <div 
      className="absolute h-64 w-64 bg-purple-500 md:h-96 md:w-96 rounded-full border border-white/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(50%_50%_at_16.8%_18.3%,_white,_rgb(184,148,225)_37.7%,_rgb(24,0,66))]" 
      style={{ boxShadow: "-20px -20px 50px rgba(255,255,255,0.5), -20px -20px 80px rgba(255,255,255,0.1), 0px 0px 50px rgb(255, 69, 103)"}}
    ></div>
    {/* Circle */}
    <motion.div 
      animate={{rotate: '1turn'}} 
      transition={{
      repeat: Infinity,
      repeatType: 'loop',
      duration: 30,
      ease: 'linear'
    }} style={{translateX: '-50%', translateY: '-50%'}} className="absolute h-[344px] w-[344px] md:h-[580px] md:w-[580px] border border-white/20 opacity-20 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-white/20 -translate-x-1/2 -translate-y-1/2" >
    <div className="absolute h-2 w-2 left-0 bg-white rounded-full top-1/2 -translate-x-1/2 -translate-y-1/2"> </div>
    <div className="absolute h-2 w-2 left-1/2 bg-white rounded-full top-0 -translate-y-1/2"> </div>
    <div className="absolute h-5 w-5 left-full border border-white rounded-full top-1/2  -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center"> 
    <div className="h-2 w-2 bg-white rounded-full"> </div>
    </div>
    </motion.div>
    {/* Circle */}
    <motion.div 
    animate={{rotate: '1turn'}} 
    style={{translateX: '-50%', translateY: '-50%'}}
    transition={{
      repeat: Infinity,
      repeatType: 'loop',
      duration: 60,
      ease: 'linear'
    }}
    
    className="absolute h-[444px] w-[444px] md:h-[780px] md:w-[780px] rounded-full border border-white/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-dashed"></motion.div>
    <motion.div 
    animate={{rotate: '1turn'}} 
    style={{translateX: '-50%', translateY: '-50%'}}
    transition={{
      repeat: Infinity,
      repeatType: 'loop',
      duration: 90,
      ease: 'linear'
    }}
    className="absolute h-[544px] w-[544px] rounded-full md:h-[980px] md:w-[980px] border border-white top-1/2 left-1/2 opacity-20 -translate-x-1/2 -translate-y-1/2 border-dashed">
    <div className="absolute h-2 w-2 left-0 bg-white rounded-full top-1/2 -translate-x-1/2 -translate-y-1/2"> </div>
    <div className="absolute h-2 w-2 left-full bg-white rounded-full top-1/2 -translate-y-1/2"> </div>

    </motion.div>



    {/* Text */}
 
    <div className="container relative mt-16">
      <h1 className="text-6xl leading-tight md:text-7xl md:leading-[1.1] font-semibold tracking-tighter bg-[radial-gradient(100%_100%_at_top_left,_white,_#FFFFFF,_rgba(255,87,87,0.5))] text-transparent bg-clip-text text-center">
        <span className="relative inline-block perspective-1000">
          <span className="relative z-10 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text transform-gpu hover:scale-105 transition-transform duration-300 inline-block [transform-style:preserve-3d] [transform:rotateX(10deg)_rotateY(-10deg)] hover:[transform:rotateX(15deg)_rotateY(-15deg)]">
            AI
            <span className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-500/20 to-red-500/20 blur-xl [transform:translateZ(-20px)]"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-500/10 to-red-500/10 [transform:translateZ(-10px)]"></span>
          </span>
        </span>{" "}
        Insights From Every Customer Call
      </h1>
      <p className="text-lg md:text-xl text-white/70 mt-5 text-center max-w-xl mx-auto">Turn conversations into data. Turn data into decisions.</p>
      <div className="flex gap-4 justify-center mt-5">
      <Button onClick={() => router.push('/login')}>Try for free</Button>
      
      </div>
    </div>
  </motion.section>;
};
