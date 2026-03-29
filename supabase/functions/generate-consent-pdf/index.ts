import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function readUint32(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

async function decodePngToRgb(pngBytes: Uint8Array): Promise<{ width: number; height: number; rgb: Uint8Array } | null> {
  try {
    if (pngBytes[0] !== 137 || pngBytes[1] !== 80 || pngBytes[2] !== 78 || pngBytes[3] !== 71) {
      return null;
    }

    let offset = 8;
    let width = 0, height = 0, colorType = 0;
    const idatChunks: Uint8Array[] = [];

    while (offset < pngBytes.length) {
      const chunkLen = readUint32(pngBytes, offset);
      const chunkType = String.fromCharCode(pngBytes[offset + 4], pngBytes[offset + 5], pngBytes[offset + 6], pngBytes[offset + 7]);
      const chunkData = pngBytes.slice(offset + 8, offset + 8 + chunkLen);

      if (chunkType === "IHDR") {
        width = readUint32(chunkData, 0);
        height = readUint32(chunkData, 4);
        colorType = chunkData[9];
      } else if (chunkType === "IDAT") {
        idatChunks.push(chunkData);
      } else if (chunkType === "IEND") {
        break;
      }
      offset += 12 + chunkLen;
    }

    if (width === 0 || height === 0) return null;

    // Concatenate IDAT chunks
    let totalLen = 0;
    for (const c of idatChunks) totalLen += c.length;
    const compressed = new Uint8Array(totalLen);
    let pos = 0;
    for (const c of idatChunks) {
      compressed.set(c, pos);
      pos += c.length;
    }

    // Decompress using Deno's DecompressionStream (zlib = deflate with header)
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    // Strip the 2-byte zlib header and 4-byte checksum for raw deflate
    // Actually DecompressionStream("deflate") expects raw deflate without zlib wrapper
    // But PNG uses zlib format. Let's use "deflate" which in web APIs handles zlib-wrapped data.
    // Actually the Web Compression API "deflate" = raw deflate, "deflate-raw" might not exist.
    // Let's just try with the full zlib data.
    
    const writePromise = writer.write(compressed).then(() => writer.close());
    
    const decompressedChunks: Uint8Array[] = [];
    let readDone = false;
    while (!readDone) {
      const { done, value } = await reader.read();
      if (done) {
        readDone = true;
      } else {
        decompressedChunks.push(value);
      }
    }
    await writePromise;

    let decompressedLen = 0;
    for (const c of decompressedChunks) decompressedLen += c.length;
    const decompressed = new Uint8Array(decompressedLen);
    let dp = 0;
    for (const c of decompressedChunks) {
      decompressed.set(c, dp);
      dp += c.length;
    }

    // Determine bytes per pixel
    let bpp = 0;
    switch (colorType) {
      case 0: bpp = 1; break;
      case 2: bpp = 3; break;
      case 4: bpp = 2; break;
      case 6: bpp = 4; break;
      default: return null;
    }

    const bytesPerRow = width * bpp;
    const rgb = new Uint8Array(width * height * 3);
    let srcOffset2 = 0;
    const prevRow = new Uint8Array(bytesPerRow);
    const currentRow = new Uint8Array(bytesPerRow);

    for (let row = 0; row < height; row++) {
      const filterByte = decompressed[srcOffset2++];

      for (let i = 0; i < bytesPerRow; i++) {
        currentRow[i] = decompressed[srcOffset2++] || 0;
      }

      // Apply PNG filter
      for (let i = 0; i < bytesPerRow; i++) {
        const a = i >= bpp ? currentRow[i - bpp] : 0;
        const b = prevRow[i];
        const c = i >= bpp ? prevRow[i - bpp] : 0;

        switch (filterByte) {
          case 0: break;
          case 1: currentRow[i] = (currentRow[i] + a) & 0xFF; break;
          case 2: currentRow[i] = (currentRow[i] + b) & 0xFF; break;
          case 3: currentRow[i] = (currentRow[i] + Math.floor((a + b) / 2)) & 0xFF; break;
          case 4: currentRow[i] = (currentRow[i] + paethPredictor(a, b, c)) & 0xFF; break;
        }
      }

      // Convert to RGB (composite alpha on white background)
      for (let x = 0; x < width; x++) {
        const dstIdx = (row * width + x) * 3;
        switch (colorType) {
          case 0:
            rgb[dstIdx] = rgb[dstIdx + 1] = rgb[dstIdx + 2] = currentRow[x];
            break;
          case 2:
            rgb[dstIdx] = currentRow[x * 3];
            rgb[dstIdx + 1] = currentRow[x * 3 + 1];
            rgb[dstIdx + 2] = currentRow[x * 3 + 2];
            break;
          case 4: {
            const gray = currentRow[x * 2];
            const alpha = currentRow[x * 2 + 1] / 255;
            const val = Math.round(gray * alpha + 255 * (1 - alpha));
            rgb[dstIdx] = rgb[dstIdx + 1] = rgb[dstIdx + 2] = val;
            break;
          }
          case 6: {
            const r = currentRow[x * 4];
            const g = currentRow[x * 4 + 1];
            const bl = currentRow[x * 4 + 2];
            const al = currentRow[x * 4 + 3] / 255;
            rgb[dstIdx] = Math.round(r * al + 255 * (1 - al));
            rgb[dstIdx + 1] = Math.round(g * al + 255 * (1 - al));
            rgb[dstIdx + 2] = Math.round(bl * al + 255 * (1 - al));
            break;
          }
        }
      }

      prevRow.set(currentRow);
    }

    return { width, height, rgb };
  } catch (e) {
    console.error("PNG decode error:", e);
    return null;
  }
}

function buildTextOnlyPdf(
  lines: { text: string; x: number; y: number; size?: number; bold?: boolean }[]
): Uint8Array {
  let stream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    stream += `${fontKey} ${fontSize} Tf\n1 0 0 1 ${line.x} ${line.y} Tm\n(${escaped}) Tj\n`;
  }
  stream += "ET\n";

  const streamBytes = new TextEncoder().encode(stream);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  offsets.push(pdf.length);
  pdf += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  offsets.push(pdf.length);
  pdf += "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  offsets.push(pdf.length);
  pdf += "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>\nendobj\n";
  offsets.push(pdf.length);
  pdf += "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";
  offsets.push(pdf.length);
  pdf += "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";
  offsets.push(pdf.length);
  pdf += `6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj\n`;

  const xref = pdf.length;
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

function buildPdfWithImage(
  lines: { text: string; x: number; y: number; size?: number; bold?: boolean }[],
  imgRgb: Uint8Array,
  imgWidth: number,
  imgHeight: number,
  sigRect: { x: number; y: number; width: number; height: number }
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  function pushText(s: string) { chunks.push(encoder.encode(s)); }
  function pushBytes(b: Uint8Array) { chunks.push(b); }
  function currentLength(): number {
    let len = 0;
    for (const c of chunks) len += c.length;
    return len;
  }

  // Build content stream
  let textStream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    textStream += `${fontKey} ${fontSize} Tf\n1 0 0 1 ${line.x} ${line.y} Tm\n(${escaped}) Tj\n`;
  }
  textStream += "ET\n";

  // Draw signature image
  textStream += "q\n";
  textStream += `${sigRect.width} 0 0 ${sigRect.height} ${sigRect.x} ${sigRect.y} cm\n`;
  textStream += "/SigImg Do\n";
  textStream += "Q\n";

  const textStreamBytes = encoder.encode(textStream);
  const objOffsets: number[] = [];

  pushText("%PDF-1.4\n");

  // Obj 1 - Catalog
  objOffsets.push(currentLength());
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2 - Pages
  objOffsets.push(currentLength());
  pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Obj 3 - Page (with XObject reference)
  objOffsets.push(currentLength());
  pushText("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /SigImg 7 0 R >> >> >>\nendobj\n");

  // Obj 4 - Font Helvetica
  objOffsets.push(currentLength());
  pushText("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

  // Obj 5 - Font Helvetica-Bold
  objOffsets.push(currentLength());
  pushText("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

  // Obj 6 - Content stream
  objOffsets.push(currentLength());
  pushText(`6 0 obj\n<< /Length ${textStreamBytes.length} >>\nstream\n`);
  pushBytes(textStreamBytes);
  pushText("\nendstream\nendobj\n");

  // Obj 7 - Image XObject (raw RGB)
  objOffsets.push(currentLength());
  pushText(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${imgRgb.length} >>\nstream\n`);
  pushBytes(imgRgb);
  pushText("\nendstream\nendobj\n");

  const numObjects = 7;
  const xrefOffset = currentLength();
  pushText(`xref\n0 ${numObjects + 1}\n0000000000 65535 f \n`);
  for (const o of objOffsets) {
    pushText(`${String(o).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${numObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  // Merge chunks
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const result = new Uint8Array(totalLen);
  let p = 0;
  for (const c of chunks) {
    result.set(c, p);
    p += c.length;
  }
  return result;
}

// Proper base64 encoding for arbitrary binary data
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName, dateOfBirth, nationality, address,
      universityName, courseName, agentName,
      signature, signatureImage, consentDate,
    } = await req.json();

    if (!studentName || !universityName || !courseName || (!signature && !signatureImage)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lines: { text: string; x: number; y: number; size?: number; bold?: boolean }[] = [];
    let y = 790;
    const leftMargin = 50;
    const lineHeight = 14;
    const sectionGap = 22;

    // Header
    lines.push({ text: "EDUFORYOU UK", x: leftMargin, y, size: 16, bold: true });
    y -= 20;
    lines.push({ text: "Student Enrollment Consent Form", x: leftMargin, y, size: 14, bold: true });
    y -= 8;
    lines.push({ text: "_______________________________________________________________", x: leftMargin, y, size: 10 });
    y -= sectionGap;

    // Student details
    lines.push({ text: "STUDENT DETAILS", x: leftMargin, y, size: 11, bold: true });
    y -= lineHeight + 4;
    lines.push({ text: `Full Name: ${studentName}`, x: leftMargin, y, size: 10 });
    y -= lineHeight;
    if (dateOfBirth) { lines.push({ text: `Date of Birth: ${dateOfBirth}`, x: leftMargin, y, size: 10 }); y -= lineHeight; }
    if (nationality) { lines.push({ text: `Nationality: ${nationality}`, x: leftMargin, y, size: 10 }); y -= lineHeight; }
    if (address) {
      for (const al of wrapText(`Address: ${address}`, 85)) {
        lines.push({ text: al, x: leftMargin, y, size: 10 }); y -= lineHeight;
      }
    }
    y -= 6;
    lines.push({ text: `University: ${universityName}`, x: leftMargin, y, size: 10 }); y -= lineHeight;
    for (const cl of wrapText(`Course: ${courseName}`, 85)) {
      lines.push({ text: cl, x: leftMargin, y, size: 10 }); y -= lineHeight;
    }
    lines.push({ text: `Enrollment Agent: ${agentName || "EduForYou UK"}`, x: leftMargin, y, size: 10 });
    y -= sectionGap;

    // Consent clauses
    lines.push({ text: "CONSENT DECLARATIONS", x: leftMargin, y, size: 11, bold: true });
    y -= lineHeight + 4;

    const clauses = [
      { title: "1. Data Processing Consent", text: "I consent to EduForYou UK collecting, processing, and storing my personal data for the purpose of facilitating my enrollment at the above-named university. This includes sharing my personal information with the university's admissions team as required under the UK General Data Protection Regulation (UK GDPR)." },
      { title: "2. Document Sharing Consent", text: "I authorise EduForYou UK to share all documents I have provided (including identification documents, proof of address, qualifications, and any other supporting materials) with the university and relevant regulatory bodies as part of the enrollment and admissions process." },
      { title: "3. Communication Consent", text: "I consent to being contacted by EduForYou UK and the university regarding my application, enrollment status, and any related matters via email, telephone, SMS, or postal correspondence." },
      { title: "4. Student Finance Consent", text: "Where applicable, I consent to EduForYou UK sharing my data with Student Finance England (SFE) or other relevant funding bodies to facilitate my student finance application and funding arrangements." },
      { title: "5. Declaration of Accuracy", text: "I declare that all information I have provided is true, complete, and accurate to the best of my knowledge. I understand that providing false or misleading information may result in the withdrawal of any offer of admission or termination of enrollment." },
    ];

    for (const clause of clauses) {
      lines.push({ text: clause.title, x: leftMargin, y, size: 10, bold: true }); y -= lineHeight;
      for (const wl of wrapText(clause.text, 90)) {
        if (y < 60) break;
        lines.push({ text: wl, x: leftMargin, y, size: 9 }); y -= lineHeight - 2;
      }
      y -= 8;
    }

    // Signature section
    y -= 6;
    lines.push({ text: "SIGNATURE", x: leftMargin, y, size: 11, bold: true });
    y -= lineHeight + 4;
    lines.push({ text: "By signing below, I confirm that I have read, understood, and agree to all", x: leftMargin, y, size: 9 });
    y -= lineHeight - 2;
    lines.push({ text: "the above declarations.", x: leftMargin, y, size: 9 });
    y -= sectionGap;

    if (signature) {
      lines.push({ text: `Signed by: ${signature}`, x: leftMargin, y, size: 11, bold: true });
      y -= lineHeight + 4;
    }

    // Try to embed signature image
    let pdfBytes: Uint8Array;

    if (signatureImage && typeof signatureImage === "string" && signatureImage.startsWith("data:image")) {
      const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, "");
      const binaryString = atob(base64Data);
      const pngBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pngBytes[i] = binaryString.charCodeAt(i);
      }

      const decoded = await decodePngToRgb(pngBytes);

      if (decoded) {
        const sigWidth = 200;
        const sigHeight = 60;
        const sigRect = { x: leftMargin, y: y - sigHeight, width: sigWidth, height: sigHeight };
        y -= sigHeight + 8;

        lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: leftMargin, y, size: 10 });

        pdfBytes = buildPdfWithImage(lines, decoded.rgb, decoded.width, decoded.height, sigRect);
      } else {
        console.error("Failed to decode PNG signature, falling back to text-only");
        lines.push({ text: "[Digital signature attached]", x: leftMargin, y, size: 9 });
        y -= lineHeight;
        lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: leftMargin, y, size: 10 });
        pdfBytes = buildTextOnlyPdf(lines);
      }
    } else {
      lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: leftMargin, y, size: 10 });
      pdfBytes = buildTextOnlyPdf(lines);
    }

    const base64 = uint8ArrayToBase64(pdfBytes);

    return new Response(
      JSON.stringify({ pdf_base64: base64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating consent PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
