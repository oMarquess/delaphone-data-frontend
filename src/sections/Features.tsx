"use client";
import Image from "next/image";
import productImage from "@/assets/product-image.png";
import DelaphoneProduct from "@/assets/Delaphone-product-3.png";

const tabs = [
  {
    title: "Real-Time Call Intelligence",
    isNew: false,
  },
  {
    title: "Agent Performance Analytics",
    isNew: false,
  },
  {
    title: "High-Impact Call Detection",
    isNew: true,
  },
];

const FeatureTab = (tab:typeof tabs[number]) => {
  return (
    <div className="relative lg:flex-1">
      {/* Gradient border */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-[#FF5757] to-[#8c45ff]" />
      </div>
      
      {/* Content */}
      <div className="p-4 rounded-[10px] flex items-center justify-center bg-gray-900 relative m-[1px]">  
        <div className="flex items-center gap-2">
          <div className="font-medium">{tab.title}</div>
          {tab.isNew && <div className="text-xs px-2 py-0.5 rounded-full bg-[#FF5757] text-white font-semibold">New</div>}
        </div>
      </div>
    </div>
  )
}

export const Features = () => {
  return <section className="py-15 md:py-15">
    <div className="container">
      <h2 className="text-5xl md:text-6xl font-medium text-center tracking-tighter">
        What You Get With 
        <span className="relative inline-block ml-2">
          Delaphone.AI
          <svg className="absolute -bottom-5 -left-2 w-[calc(100%+16px)]" height="28" viewBox="0 0 220 28" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M10 14.5C25 6 40 20 60 10.5C80 1 100 18 130 12.5C160 7 180 22 210 14.5" 
                  fill="url(#brush-gradient)" 
                  strokeWidth="2"
                  className="opacity-90"
                  stroke="url(#brush-gradient)"
                  strokeLinecap="round"/>
            <path d="M5 18.5C20 10 35 24 55 14.5C75 5 95 22 125 16.5C155 11 175 26 215 18.5" 
                  className="opacity-80"
                  fill="url(#brush-gradient-2)" 
                  strokeWidth="1"
                  stroke="url(#brush-gradient-2)"
                  strokeLinecap="round"/>
            <defs>
              <linearGradient id="brush-gradient" x1="0" y1="14" x2="220" y2="14" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF5757"/>
                <stop offset="1" stopColor="#8c45ff"/>
              </linearGradient>
              <linearGradient id="brush-gradient-2" x1="220" y1="14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF5757" stopOpacity="0.8"/>
                <stop offset="1" stopColor="#8c45ff" stopOpacity="0.8"/>
              </linearGradient>
            </defs>
          </svg>
        </span>
      </h2>
      <p className="text-white/70 text-lg tracking-tight md:text-xl max-w-xl mx-auto text-center mt-5">Boost revenue, accelerate growth, and reduce operational costs by turning every call into a strategic advantage.</p>
      <div className="mt-10 flex flex-col lg:flex-row gap-3">
      {tabs.map((tab) => (
        <FeatureTab key={tab.title} {...tab} />
      ))}
      </div>
      
      <div className="mt-8 relative">
        {/* Decorative elements */}
        <div className="absolute -top-4 -left-4 w-12 h-12 border border-white/20 rounded-full bg-gradient-to-br from-[#FF5757]/20 to-transparent z-10"></div>
        <div className="absolute -bottom-4 -right-4 w-16 h-16 border border-white/20 rounded-full bg-gradient-to-tl from-[#8c45ff]/20 to-transparent z-10"></div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[#FF5757]/5 blur-3xl rounded-full scale-90 -z-10 animate-pulse"></div>
        <div className="absolute inset-0 bg-[#8c45ff]/5 blur-2xl rounded-full -z-10"></div>
        
        {/* Main container with shadow effects */}
        <div className="border border-white/20 p-4 rounded-xl relative overflow-hidden backdrop-blur-sm
                        shadow-[0_0_25px_rgba(140,69,255,0.1),0_0_15px_rgba(255,87,87,0.1)]
                        transform hover:scale-[1.01] transition-all duration-500">
          {/* Floating dots */}
          <div className="absolute top-6 right-6 h-2 w-2 rounded-full bg-[#FF5757]/60"></div>
          <div className="absolute bottom-8 left-8 h-3 w-3 rounded-full bg-[#8c45ff]/60"></div>
          
          {/* Main image */}
          <div className="aspect-video bg-cover rounded-lg relative z-0" 
               style={{
                 backgroundImage: `url(${DelaphoneProduct.src})`,
                 boxShadow: 'inset 0 0 20px rgba(255,255,255,0.1)'
               }}>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#8c45ff]/10 via-transparent to-[#FF5757]/10 rounded-lg mix-blend-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  </section>;
};
