const CHUNK_SIZE = 16 * 1024;
const BUFFERED_AMOUNT_LOW_THRESHOLD = 64 * 1024;

export function createPeerConnection(onConnectionState){
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  const pc = new RTCPeerConnection(config);
  pc.addEventListener("connectionstatechange", () => onConnectionState?.(pc.connectionState));
  return pc;
}

export function waitForIceGatheringComplete(pc){
  return new Promise((resolve)=>{
    if(pc.iceGatheringState === "complete") return resolve(pc.localDescription);
    const check = () => {
      if(pc.iceGatheringState === "complete"){
        pc.removeEventListener("icegatheringstatechange", check);
        resolve(pc.localDescription);
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });
}

const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function waitForBufferLow(dc){
  while(dc.bufferedAmount > BUFFERED_AMOUNT_LOW_THRESHOLD){
    await sleep(50);
  }
}

export function setupSenderChannel(dc, {onOpen, onClose, onError}){
  dc.onopen = onOpen;
  dc.onclose = onClose;
  dc.onerror = onError;
}

export function setupReceiverChannel(dc, {onOpen, onMessage, onClose, onError}){
  dc.binaryType = "arraybuffer";
  dc.onopen = onOpen;
  dc.onmessage = (e)=>onMessage(e.data);
  dc.onclose = onClose;
  dc.onerror = onError;
}

export async function sendFile(dc, file, onProgress){
  const header = JSON.stringify({
    filename: file.name,
    size: file.size,
    type: file.type || "application/octet-stream"
  });
  dc.send(header);

  const arrayBuffer = await file.arrayBuffer();
  let offset = 0;

  while(offset < arrayBuffer.byteLength){
    const chunk = arrayBuffer.slice(offset, offset + CHUNK_SIZE);
    await waitForBufferLow(dc);
    dc.send(chunk);
    offset += CHUNK_SIZE;
    onProgress?.(Math.min(100, (offset / arrayBuffer.byteLength) * 100));
  }
  dc.send(JSON.stringify({ done: true }));
}
