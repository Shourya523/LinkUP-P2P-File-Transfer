import { useRef, useState } from "react";
import Header from "./components/Header.jsx";
import RoleSelector from "./components/RoleSelector.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import StatusCard from "./components/StatusCard.jsx";
import {
  createPeerConnection,
  waitForIceGatheringComplete,
  setupSenderChannel,
  setupReceiverChannel,
  sendFile
} from "./webrtc/p2p.js";

export default function App(){
  const [role, setRole] = useState("sender");
  const [status, setStatus] = useState("");
  const [file, setFile] = useState(null);

  // offer/answer text
  const [localOffer, setLocalOffer] = useState("");
  const [remoteAnswer, setRemoteAnswer] = useState("");
  const [remoteOffer, setRemoteOffer] = useState("");
  const [localAnswer, setLocalAnswer] = useState("");

  // progress
  const [sendPct, setSendPct] = useState(0);
  const [recvPct, setRecvPct] = useState(0);

  // receiver file
  const [recvName, setRecvName] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  // rtc state
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const receiveBufferRef = useRef([]);
  const receivedBytesRef = useRef(0);
  const expectedSizeRef = useRef(0);
  const expectedNameRef = useRef("");

  function copy(text){
    navigator.clipboard.writeText(text).then(()=>setStatus("Copied to clipboard ✓"));
  }

  function resetRecv(){
    receiveBufferRef.current = [];
    receivedBytesRef.current = 0;
    expectedSizeRef.current = 0;
    expectedNameRef.current = "";
    setRecvPct(0);
    setDownloadUrl("");
    setRecvName("");
  }

  // ----- SENDER FLOW -----
  async function createOffer(){
    if(!file){ setStatus("Select a file first"); return; }
    const pc = createPeerConnection((st)=> st==="connected" && setStatus("Connected! 🎉"));
    pcRef.current = pc;

    const dc = pc.createDataChannel("file-transfer",{ ordered:true });
    dcRef.current = dc;

    setupSenderChannel(dc, {
      onOpen: async () => {
        setStatus("Channel open. Starting transfer…");
        setSendPct(0);
        await sendFile(dc, file, (p)=>setSendPct(p));
        setStatus("File transfer complete! ✓");
      },
      onClose: () => {},
      onError: (e) => console.error(e)
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    setStatus("Gathering ICE candidates…");
    const localDesc = await waitForIceGatheringComplete(pc);
    setLocalOffer(btoa(JSON.stringify(localDesc)));
  }

  async function applyAnswer(){
    if(!pcRef.current) return setStatus("No peer connection");
    if(!remoteAnswer.trim()) return setStatus("Paste the answer");
    try{
      const answer = JSON.parse(atob(remoteAnswer.trim()));
      await pcRef.current.setRemoteDescription(answer);
      setStatus("Answer applied. Waiting for connection…");
    }catch(e){
      setStatus("Failed to process answer. Check the format.");
    }
  }

  // ----- RECEIVER FLOW -----
  async function acceptOffer(){
    resetRecv();
    if(!remoteOffer.trim()) return setStatus("Paste the offer from the sender");
    try{
      const offerDesc = JSON.parse(atob(remoteOffer.trim()));
      const pc = createPeerConnection((st)=> st==="connected" && setStatus("Connected! 🎉"));
      pcRef.current = pc;

      pc.addEventListener("datachannel",(ev)=>{
        const dc = ev.channel;
        dcRef.current = dc;

        setupReceiverChannel(dc, {
          onOpen: ()=> setStatus("Channel open. Waiting for file…"),
          onMessage: handleIncoming,
          onClose: ()=>{},
          onError: (e)=>console.error(e)
        });
      });

      await pc.setRemoteDescription(offerDesc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setStatus("Gathering ICE for answer…");
      const localDesc = await waitForIceGatheringComplete(pc);
      setLocalAnswer(btoa(JSON.stringify(localDesc)));
      setStatus("Answer ready! Send it back to the sender.");
    }catch(e){
      setStatus("Failed to process offer. Check the format.");
    }
  }

  function handleIncoming(data){
    if(typeof data === "string"){
      try{
        const obj = JSON.parse(data);
        if(obj?.done){
          assembleFile();
          return;
        }
        if(obj.filename && obj.size){
          expectedNameRef.current = obj.filename;
          expectedSizeRef.current = Number(obj.size);
          receiveBufferRef.current = [];
          receivedBytesRef.current = 0;
          setStatus(`Receiving ${obj.filename}…`);
          return;
        }
      }catch(_){}
    }

    if(data instanceof ArrayBuffer){
      receiveBufferRef.current.push(data);
      receivedBytesRef.current += data.byteLength;
      const p = Math.min(100,(receivedBytesRef.current/expectedSizeRef.current)*100);
      setRecvPct(p);
      if(receivedBytesRef.current >= expectedSizeRef.current){
        assembleFile();
      }
    }
  }

  function assembleFile(){
    if(receivedBytesRef.current === 0){ setStatus("No data received"); return; }
    const blob = new Blob(receiveBufferRef.current);
    const url = URL.createObjectURL(blob);
    setRecvName(expectedNameRef.current || "download.bin");
    setDownloadUrl(url);
    setStatus("File received successfully! ✓");
  }

  return (
    <>
      <Header/>
      <div className="container">
        <div className="card info-card">
          <div className="info-header">
            <div className="info-icon">📡</div>
            <div>
              <h3>How it works</h3>
              <p>This uses WebRTC DataChannels for direct peer-to-peer transfer. Choose a role, exchange the offer/answer codes, and transfer directly between devices.</p>
            </div>
          </div>
        </div>

        <RoleSelector role={role} setRole={setRole} />

        {role === "sender" && (
          <>
            <div className="card">
              <h2>Step 2: Select File & Create Offer</h2>
              <div className="file-input-wrapper">
                <input id="fileInput" type="file" style={{display:"none"}}
                       onChange={(e)=>{ const f=e.target.files?.[0]; setFile(f||null); }} />
                <button className="btn file-input-btn" onClick={()=>document.getElementById("fileInput").click()}>
                  <span className="icon">📁</span>
                  <span>{file?file.name:"Choose File"}</span>
                </button>
                {file && <span className="badge">{(file.size/1024/1024).toFixed(2)} MB</span>}
              </div>
              <button className="btn btn-primary w-full" disabled={!file} onClick={createOffer}>Create Offer</button>

              {localOffer && (
                <div className="textarea-wrapper" style={{marginTop:"1rem"}}>
                  <div className="textarea-header">
                    <label className="textarea-label">Your Offer Code</label>
                    <button className="btn btn-icon-copy" onClick={()=>copy(localOffer)}>📋</button>
                  </div>
                  <textarea readOnly value={localOffer} onFocus={(e)=>e.target.select()} />
                  <p className="textarea-hint">Share this code with the receiver</p>
                </div>
              )}
            </div>

            <div className="card">
              <h2>Step 3: Paste Answer from Receiver</h2>
              <div className="textarea-wrapper">
                <textarea placeholder="Paste the answer code here..." value={remoteAnswer} onChange={e=>setRemoteAnswer(e.target.value)} onFocus={(e)=>e.target.select()} />
              </div>
              <button className="btn btn-primary w-full" onClick={applyAnswer}>Apply Answer</button>
            </div>

            {sendPct>0 && (
              <div className="card">
                <h2>Transfer Progress</h2>
                <ProgressBar label="sent" value={sendPct}/>
              </div>
            )}
          </>
        )}

        {role === "receiver" && (
          <>
            <div className="card">
              <h2>Step 2: Paste Offer & Create Answer</h2>
              <div className="textarea-wrapper">
                <textarea placeholder="Paste the offer code from sender here..." value={remoteOffer} onChange={e=>setRemoteOffer(e.target.value)} onFocus={(e)=>e.target.select()} />
              </div>
              <button className="btn btn-primary w-full" onClick={acceptOffer}>Accept Offer & Create Answer</button>

              {localAnswer && (
                <div className="textarea-wrapper" style={{marginTop:"1rem"}}>
                  <div className="textarea-header">
                    <label className="textarea-label">Your Answer Code</label>
                    <button className="btn btn-icon-copy" onClick={()=>copy(localAnswer)}>📋</button>
                  </div>
                  <textarea readOnly value={localAnswer} onFocus={(e)=>e.target.select()} />
                  <p className="textarea-hint">Send this code back to the sender</p>
                </div>
              )}
            </div>

            {recvPct>0 && (
              <div className="card">
                <h2>Receiving File…</h2>
                <ProgressBar label="received" value={recvPct}/>
              </div>
            )}

            {downloadUrl && (
              <div className="card success-card">
                <div className="success-content">
                  <div className="success-icon">📄</div>
                  <div className="success-text">
                    <h3>File Ready!</h3>
                    <p>{recvName}</p>
                  </div>
                </div>
                <a className="btn btn-primary" href={downloadUrl} download={recvName}>⬇️ Download</a>
              </div>
            )}
          </>
        )}

        <StatusCard text={status}/>
      </div>
    </>
  );
}
