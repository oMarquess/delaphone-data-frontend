interface ButtonProps extends React.PropsWithChildren {
  onClick?: () => void;
}

const Button = ({ children, onClick }: ButtonProps) => {
  return (
  <button 
    onClick={onClick}
    className="relative py-3 px-6 rounded-lg overflow-hidden font-medium text-sm bg-gradient-to-b from-[#8c45ff] to-[#5F17ED] shadow-[0px_0px_12px_#8c45ff]"
  >
    <div className="absolute inset-0 rounded-lg">
      <div className="border border-white/20 absolute inset-0 rounded-lg [mask-image:linear-gradient(to_bottom, black, transparent)]"></div>
      <div className="border absolute inset-0 rounded-lg border-white/40 [mask-image:linear-gradient(to_top, black, transparent)]"></div>    
      <div className="absolute inset-0 shadow-[0_0_12px_rgba(140,69,255,0.7)_inset] rounded-lg"></div>        
    </div>
    <span className="relative text-white font-medium">{children}</span>
  </button>
  );
};

export { Button };