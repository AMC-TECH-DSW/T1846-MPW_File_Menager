// Implementacja CRC32
class CRC32 {
  constructor() {
    this.table = this.generateTable();
  }

  generateTable() {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) {
          c = 0xedb88320 ^ (c >>> 1);
        } else {
          c = c >>> 1;
        }
      }
      table[n] = c;
    }
    return table;
  }

  compute(data) {
    let crc = 0 ^ -1;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.table[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }
}

// Funkcja dzieląca binarny plik na części
async function splitBinaryFile(file, partsCount = 7, partSize = 0xF0000) {
  const buffer = await file.arrayBuffer();
  const crc32 = new CRC32();
  const totalCrc = crc32.compute(new Uint8Array(buffer));

  const parts = [];
  for (let i = 0; i < partsCount; i++) {
    const offset = i * partSize;
    const end = Math.min(offset + partSize, buffer.byteLength);
    const partData = buffer.slice(offset, end);

    const partCrc = crc32.compute(new Uint8Array(partData));

    // Możesz dodać tutaj dodatkowy nagłówek (np. preamble, struct info) — uproszczone
    const preamble = new TextEncoder().encode("E90502209C0F0840EE00000000000000008F0100000000010000000000000000");
    const finalPart = new Uint8Array(preamble.length + partData.byteLength + 4);

    finalPart.set(preamble, 0);
    finalPart.set(new Uint8Array(partData), preamble.length);

    // Dopisz CRC32 na końcu
    finalPart.set([
      partCrc & 0xff,
      (partCrc >> 8) & 0xff,
      (partCrc >> 16) & 0xff,
      (partCrc >> 24) & 0xff
    ], preamble.length + partData.byteLength);

    parts.push({
      data: finalPart,
      crc: partCrc,
      totalCrc: totalCrc,
      partIndex: i + 1
    });
  }

  return parts;
}

// Przykład użycia
document.getElementById("processBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  const typeSelect = document.getElementById("typeSelect");
  const outputDiv = document.getElementById("output");

  if (!fileInput.files.length) {
    alert("Wybierz plik binarny!");
    return;
  }

  const file = fileInput.files[0];
  const type = typeSelect.value;

  outputDiv.innerHTML = "Przetwarzanie...";

  const partsCount = type === "softControl" ? 1 : (type === "softLcd" ? 2 : (type === "iot" ? 3 : 7));

  const parts = await splitBinaryFile(file, partsCount);

  outputDiv.innerHTML = "";

  parts.forEach((part, idx) => {
    const blob = new Blob([part.data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Part_${idx + 1}_${type}.bin`;
    link.textContent = `Pobierz Part ${idx + 1}`;

    outputDiv.appendChild(link);
    outputDiv.appendChild(document.createElement("br"));
  });
});
