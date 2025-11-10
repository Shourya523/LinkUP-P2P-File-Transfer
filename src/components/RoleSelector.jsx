export default function RoleSelector({role,setRole}){
  return (
    <div className="card">
      <h2>Step 1: Choose Your Role</h2>
      <div className="role-buttons">
        <button className={`btn btn-role ${role==='sender'?'active':''}`} onClick={()=>setRole('sender')}>
          <span className="icon">📤</span>
          <div className="role-content">
            <div className="role-title">Sender</div>
            <div className="role-subtitle">Send a file</div>
          </div>
        </button>
        <button className={`btn btn-role ${role==='receiver'?'active':''}`} onClick={()=>setRole('receiver')}>
          <span className="icon">📥</span>
          <div className="role-content">
            <div className="role-title">Receiver</div>
            <div className="role-subtitle">Receive a file</div>
          </div>
        </button>
      </div>
    </div>
  );
}
