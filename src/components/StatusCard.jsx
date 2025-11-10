export default function StatusCard({text}){
  if(!text) return null;
  return (
    <div className="card status-card">
      <p>{text}</p>
    </div>
  );
}
