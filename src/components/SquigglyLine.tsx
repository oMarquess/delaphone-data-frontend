export const SquigglyLine = ({ className = "" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 120 15" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full ${className}`}
    >
      <path 
        d="M0 7.5C15 2.5 15 12.5 30 7.5C45 2.5 45 12.5 60 7.5C75 2.5 75 12.5 90 7.5C105 2.5 105 12.5 120 7.5" 
        stroke="url(#squiggly-gradient)" 
        strokeWidth="3" 
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="squiggly-gradient" x1="0" y1="7" x2="120" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5757" />
          <stop offset="1" stopColor="#FF87A2" />
        </linearGradient>
      </defs>
    </svg>
  );
}; 