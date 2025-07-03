// Inicjalizacja tablicy CRC32
const crcTable = (() => {
  let c;
  let table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function padArray(buf, targetSize) {
  if (buf.length >= targetSize) return buf;
  let padded = new Uint8Array(targetSize);
  padded.set(buf, 0);
  return padded;
}

let generatedFiles = []; // Przechowuje wygenerowane części

document.getElementById('processBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const type = document.getElementById('typeSelect').value;
  const output = document.getElementById('output');
  output.innerHTML = "";

  generatedFiles = []; // Czyścimy listę

  if (!fileInput.files.length) {
    alert("Wybierz plik!");
    return;
  }

  const file = fileInput.files[0];
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  const partSize = 0xF0000; // 983,040 bajtów ≈ 0.94 MB
  const partCount = Math.ceil(data.length / partSize);

  for (let partNum = 0; partNum < partCount; partNum++) {
    const offset = partNum * partSize;
    const partData = data.slice(offset, offset + partSize);

    const descriptor = new TextEncoder().encode("descriptor" + partNum);
    const paddedDescriptor = padArray(descriptor, 80);

    const preamble = new Uint8Array([0xE9, 0x05, 0x02, 0x20, 0x9C, 0x0F, 0x08, 0x40, 0xEE, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    const crcPart = crc32(partData);
    const crcBytes = new Uint8Array([
      crcPart & 0xFF,
      (crcPart >> 8) & 0xFF,
      (crcPart >> 16) & 0xFF,
      (crcPart >> 24) & 0xFF,
    ]);

    const finalData = new Uint8Array(
      preamble.length + paddedDescriptor.length + partData.length + crcBytes.length
    );

    finalData.set(preamble, 0);
    finalData.set(paddedDescriptor, preamble.length);
    finalData.set(partData, preamble.length + paddedDescriptor.length);
    finalData.set(crcBytes, preamble.length + paddedDescriptor.length + partData.length);

    const filename = `Part_${partNum + 1}_${type}.bin`;
    generatedFiles.push({ name: filename, data: finalData });

    // Link pojedynczy
    const blob = new Blob([finalData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.textContent = `Pobierz ${filename}`;
    link.classList.add('part');

    output.appendChild(link);
  }

  // Dodaj przycisk "Pobierz wszystko (ZIP)"
  const zipBtn = document.createElement('button');
  zipBtn.textContent = "Pobierz wszystko (ZIP)";
  zipBtn.style.marginTop = "1em";
  zipBtn.addEventListener('click', downloadZip);
  output.appendChild(zipBtn);
});

async function downloadZip() {
  const zip = new JSZip();

  generatedFiles.forEach(file => {
    zip.file(file.name, file.data);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = "parts.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
