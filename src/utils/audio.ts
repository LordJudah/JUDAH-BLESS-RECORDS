export function pcmToBase64Wav(pcmBase64: string, sampleRate = 24000): string {
  // If it already has a RIFF header (starts with 'UklGR' in base64), return as is
  if (pcmBase64.startsWith('UklGR')) {
    return pcmBase64;
  }

  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const buffer = new ArrayBuffer(44 + bytes.length);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bytes.length, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 

  writeString(view, 36, 'data');
  view.setUint32(40, bytes.length, true);

  const dataArray = new Uint8Array(buffer, 44);
  dataArray.set(bytes);

  let binary = '';
  const outBytes = new Uint8Array(buffer);
  for (let i = 0; i < outBytes.byteLength; i++) {
    binary += String.fromCharCode(outBytes[i]);
  }
  return btoa(binary);
}
