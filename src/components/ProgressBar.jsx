export default function ProgressBar({label, value}){
  return (
    <div className="progress-wrapper">
      <div className="progress-bar"><div className="progress-fill" style={{width:`${value}%`}}/></div>
      <p className="progress-text">{Math.round(value)}% {label}</p>
    </div>
  );
}
