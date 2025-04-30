import avatar1 from "@/assets/avatar-1.png";
import avatar2 from "@/assets/avatar-2.png";
import avatar3 from "@/assets/avatar-3.png";
import avatar4 from "@/assets/avatar-4.png";
import Image from "next/image";

const testimonials = [
  {
    text: "“Delaphone.AI has transformed our customer service by identifying key issues we were missing in our calls. Our resolution rates improved by 37% in just two months.”",
    name: "Sophia Perez",
    title: "Customer Success Director @ Quantum",
    avatarImg: avatar1,
  },
  {
    text: "“The AI insights from our sales calls helped us discover conversion patterns we had overlooked. We've been able to train our team based on actual data, not just instinct.”",
    name: "Jamie Lee",
    title: "Sales Director @ Pulse",
    avatarImg: avatar2,
  },
  {
    text: "“The ability to automatically analyze thousands of customer calls has been game-changing. We're making product decisions based on real customer feedback now.”",
    name: "Alisa Hester",
    title: "Product Lead @ Innovate",
    avatarImg: avatar3,
  },
  {
    text: "“Our support team is 30% more efficient since implementing Delaphone.AI. The actionable insights from each call have streamlined our entire customer journey.”",
    name: "Alec Whitten",
    title: "CTO @ Tech Solutions",
    avatarImg: avatar4,
  },
];

export const Testimonials = () => {
  return <section className="pt-28 pb-18 md:py-24">
    <div className="container">
      <h2 className="text-5xl md:text-6xl font-medium text-center tracking-tighter">What Our Clients Say</h2>
      <p className="text-white/70 text-lg tracking-tight md:text-xl max-w-sm mx-auto text-center mt-5">Real results from real businesses using our AI call analytics.</p>
      <div className="overflow-hidden mt-10" style={{ 
        WebkitMaskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
        maskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)" 
      }}>
       <div className="flex gap-5 animate-scroll">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="border border-white/15 rounded-xl p-6 md:p-10 flex flex-col bg-[linear-gradient(to_bottom_left,rgba(140,69,255,0.3),black)] max-w-xs md:max-w-md flex-none">
              <p className="text-base font-medium tracking-tight md:text-lg text-white/90">{testimonial.text}</p>
              <div className="mt-6 flex flex-col items-center md:flex-row md:items-center gap-4">
                <div className="relative h-11 w-11">
                  <div className="absolute inset-0 rounded-lg border border-white/30 z-10"></div>
                  <div className="absolute inset-0 bg-[rgb(140,69,255)] mix-blend-soft-light rounded-lg"></div>
                  <Image src={testimonial.avatarImg} alt={testimonial.name} className="h-11 w-11 rounded-lg grayscale" />
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-white/70">{testimonial.title}</div>
                </div>
              </div>
            </div>
          ))}
          {/* Duplicate the testimonials to create a seamless loop */}
          {testimonials.map((testimonial) => (
            <div key={`repeat-${testimonial.name}`} className="border border-white/15 rounded-xl p-6 md:p-10 flex flex-col bg-[linear-gradient(to_bottom_left,rgba(140,69,255,0.3),black)] max-w-xs md:max-w-md flex-none">
              <p className="text-base font-medium tracking-tight md:text-lg text-white/90">{testimonial.text}</p>
              <div className="mt-6 flex flex-col items-center md:flex-row md:items-center gap-4">
                <div className="relative h-11 w-11">
                  <div className="absolute inset-0 rounded-lg border border-white/30 z-10"></div>
                  <div className="absolute inset-0 bg-[rgb(140,69,255)] mix-blend-soft-light rounded-lg"></div>
                  <Image src={testimonial.avatarImg} alt={testimonial.name} className="h-11 w-11 rounded-lg grayscale" />
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-white/70">{testimonial.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>;
};
