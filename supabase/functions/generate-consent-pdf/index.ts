import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPdf(
  lines: { text: string; x: number; y: number; size?: number; bold?: boolean }[],
  signatureImageBytes?: Uint8Array,
  signatureRect?: { x: number; y: number; width: number; height: number }
): Uint8Array {
  // We'll build objects manually with proper numbering
  const pdfObjects: { id: number; content: string }[] = [];
  let nextId = 1;

  function addObj(content: string): number {
    const id = nextId++;
    pdfObjects.push({ id, content });
    return id;
  }

  // 1 - Catalog
  const catalogId = addObj(""); // placeholder
  // 2 - Pages
  const pagesId = addObj(""); // placeholder
  // 3 - Font Helvetica
  const fontId = addObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  );
  // 4 - Font Helvetica-Bold
  const fontBoldId = addObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  );

  // Build text content stream
  let stream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    stream += `${fontKey} ${fontSize} Tf\n`;
    stream += `1 0 0 1 ${line.x} ${line.y} Tm\n`;
    stream += `(${escaped}) Tj\n`;
  }
  stream += "ET\n";

  // If we have a signature image, draw it
  if (signatureImageBytes && signatureRect) {
    const { x, y, width, height } = signatureRect;
    stream += "q\n";
    stream += `${width} 0 0 ${height} ${x} ${y} cm\n`;
    stream += "/SigImg Do\n";
    stream += "Q\n";
  }

  const streamBytes = new TextEncoder().encode(stream);

  // 5 - Content stream
  const contentId = addObj(
    `<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream`
  );

  // Build resources dict
  let resourcesDict = `<< /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >>`;

  let sigImageId: number | null = null;
  if (signatureImageBytes && signatureRect) {
    // Decode PNG to get raw pixel data - we'll embed as a raw image
    // For simplicity, embed the PNG directly using DCTDecode workaround
    // Actually, PDF supports inline PNG-like with FlateDecode, but easiest is to
    // embed as a raw stream. We'll use the PNG bytes directly.
    
    // Parse PNG to extract dimensions and raw RGBA data
    const png = parsePng(signatureImageBytes);
    
    if (png) {
      // Create image XObject with raw RGB data (strip alpha, use alpha as SMask)
      const rgbData = new Uint8Array(png.width * png.height * 3);
      const alphaData = new Uint8Array(png.width * png.height);
      
      for (let i = 0; i < png.width * png.height; i++) {
        rgbData[i * 3] = png.pixels[i * 4];
        rgbData[i * 3 + 1] = png.pixels[i * 4 + 1];
        rgbData[i * 3 + 2] = png.pixels[i * 4 + 2];
        alphaData[i] = png.pixels[i * 4 + 3];
      }

      // SMask for transparency
      const smaskId = addObj(
        `<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${alphaData.length} >>\nstream\n__BINARY_SMASK__\nendstream`
      );

      // Image XObject
      sigImageId = addObj(
        `<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgbData.length} /SMask ${smaskId} 0 R >>\nstream\n__BINARY_RGB__\nendstream`
      );

      resourcesDict += ` /XObject << /SigImg ${sigImageId} 0 R >>`;
    }
  }

  resourcesDict += " >>";

  // 6 - Page
  const pageId = addObj(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources ${resourcesDict} >>`
  );

  // Update catalog and pages
  pdfObjects[0].content = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  pdfObjects[1].content = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;

  // Now serialize - but we need to handle binary data specially
  // Let's build as binary
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  function pushText(s: string) {
    chunks.push(encoder.encode(s));
  }

  // If we have image data, we need to parse the PNG and build binary
  let png: { width: number; height: number; pixels: Uint8Array } | null = null;
  let rgbData: Uint8Array | null = null;
  let alphaData: Uint8Array | null = null;

  if (signatureImageBytes && signatureRect) {
    png = parsePng(signatureImageBytes);
    if (png) {
      rgbData = new Uint8Array(png.width * png.height * 3);
      alphaData = new Uint8Array(png.width * png.height);
      for (let i = 0; i < png.width * png.height; i++) {
        rgbData[i * 3] = png.pixels[i * 4];
        rgbData[i * 3 + 1] = png.pixels[i * 4 + 1];
        rgbData[i * 3 + 2] = png.pixels[i * 4 + 2];
        alphaData[i] = png.pixels[i * 4 + 3];
      }
    }
  }

  pushText("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const objOffsets: number[] = [];
  
  function currentLength(): number {
    let len = 0;
    for (const c of chunks) len += c.length;
    return len;
  }

  for (const obj of pdfObjects) {
    objOffsets.push(currentLength());
    const content = obj.content;
    
    if (content.includes("__BINARY_SMASK__") && alphaData) {
      const parts = content.split("__BINARY_SMASK__");
      const header = parts[0].replace(
        `${alphaData.length}`,
        `${alphaData.length}`
      );
      pushText(`${obj.id} 0 obj\n`);
      pushText(`<< /Type /XObject /Subtype /Image /Width ${png!.width} /Height ${png!.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${alphaData.length} >>\nstream\n`);
      chunks.push(alphaData);
      pushText("\nendstream\nendobj\n");
    } else if (content.includes("__BINARY_RGB__") && rgbData) {
      pushText(`${obj.id} 0 obj\n`);
      // Find smask ref in the content
      const smaskMatch = content.match(/\/SMask (\d+) 0 R/);
      const smaskRef = smaskMatch ? smaskMatch[0] : "";
      pushText(`<< /Type /XObject /Subtype /Image /Width ${png!.width} /Height ${png!.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgbData.length} ${smaskRef ? `/${smaskRef}` : ""} >>\nstream\n`);
      chunks.push(rgbData);
      pushText("\nendstream\nendobj\n");
    } else {
      pushText(`${obj.id} 0 obj\n${content}\nendobj\n`);
    }
  }

  const xrefOffset = currentLength();
  pushText("xref\n");
  pushText(`0 ${pdfObjects.length + 1}\n`);
  pushText("0000000000 65535 f \n");
  for (const offset of objOffsets) {
    pushText(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  pushText("trailer\n");
  pushText(`<< /Size ${pdfObjects.length + 1} /Root ${catalogId} 0 R >>\n`);
  pushText("startxref\n");
  pushText(`${xrefOffset}\n`);
  pushText("%%EOF\n");

  // Merge all chunks
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}

// Minimal PNG decoder - extracts RGBA pixel data
function parsePng(data: Uint8Array): { width: number; height: number; pixels: Uint8Array } | null {
  try {
    // Check PNG signature
    if (data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) {
      return null;
    }

    let offset = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks: Uint8Array[] = [];

    while (offset < data.length) {
      const chunkLen = (data[offset] << 24) | (data[offset+1] << 16) | (data[offset+2] << 8) | data[offset+3];
      const chunkType = String.fromCharCode(data[offset+4], data[offset+5], data[offset+6], data[offset+7]);
      
      if (chunkType === "IHDR") {
        width = (data[offset+8] << 24) | (data[offset+9] << 16) | (data[offset+10] << 8) | data[offset+11];
        height = (data[offset+12] << 24) | (data[offset+13] << 16) | (data[offset+14] << 8) | data[offset+15];
        bitDepth = data[offset+16];
        colorType = data[offset+17];
      } else if (chunkType === "IDAT") {
        idatChunks.push(data.slice(offset+8, offset+8+chunkLen));
      } else if (chunkType === "IEND") {
        break;
      }
      
      offset += 12 + chunkLen;
    }

    if (width === 0 || height === 0) return null;

    // Concatenate IDAT chunks
    let totalIdat = 0;
    for (const c of idatChunks) totalIdat += c.length;
    const compressedData = new Uint8Array(totalIdat);
    let p = 0;
    for (const c of idatChunks) {
      compressedData.set(c, p);
      p += c.length;
    }

    // Decompress using DecompressionStream
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    
    writer.write(compressedData);
    writer.close();
    
    const decompressedChunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await_read(reader);
      if (done) break;
      decompressedChunks.push(value);
    }
    
    // This won't work synchronously. Let's use a simpler approach.
    // Actually in Deno we can use pako-like or just skip PNG parsing.
    // 
    // Better approach: just return null and fall back to not embedding the image
    // if we can't parse the PNG.
    return null;
  } catch {
    return null;
  }
}

// Dummy - won't actually be called due to the return null above
function await_read(_reader: any): { done: boolean; value: Uint8Array } {
  return { done: true, value: new Uint8Array(0) };
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName,
      dateOfBirth,
      nationality,
      address,
      universityName,
      courseName,
      agentName,
      signature,
      signatureImage,
      consentDate,
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

    // Student details section
    lines.push({ text: "STUDENT DETAILS", x: leftMargin, y, size: 11, bold: true });
    y -= lineHeight + 4;
    lines.push({ text: `Full Name: ${studentName}`, x: leftMargin, y, size: 10 });
    y -= lineHeight;
    if (dateOfBirth) {
      lines.push({ text: `Date of Birth: ${dateOfBirth}`, x: leftMargin, y, size: 10 });
      y -= lineHeight;
    }
    if (nationality) {
      lines.push({ text: `Nationality: ${nationality}`, x: leftMargin, y, size: 10 });
      y -= lineHeight;
    }
    if (address) {
      const addrLines = wrapText(`Address: ${address}`, 85);
      for (const al of addrLines) {
        lines.push({ text: al, x: leftMargin, y, size: 10 });
        y -= lineHeight;
      }
    }
    y -= 6;
    lines.push({ text: `University: ${universityName}`, x: leftMargin, y, size: 10 });
    y -= lineHeight;
    const courseLines = wrapText(`Course: ${courseName}`, 85);
    for (const cl of courseLines) {
      lines.push({ text: cl, x: leftMargin, y, size: 10 });
      y -= lineHeight;
    }
    lines.push({ text: `Enrollment Agent: ${agentName || "EduForYou UK"}`, x: leftMargin, y, size: 10 });
    y -= sectionGap;

    // Consent clauses
    lines.push({ text: "CONSENT DECLARATIONS", x: leftMargin, y, size: 11, bold: true });
    y -= lineHeight + 4;

    const clauses = [
      {
        title: "1. Data Processing Consent",
        text: "I consent to EduForYou UK collecting, processing, and storing my personal data for the purpose of facilitating my enrollment at the above-named university. This includes sharing my personal information with the university's admissions team as required under the UK General Data Protection Regulation (UK GDPR).",
      },
      {
        title: "2. Document Sharing Consent",
        text: "I authorise EduForYou UK to share all documents I have provided (including identification documents, proof of address, qualifications, and any other supporting materials) with the university and relevant regulatory bodies as part of the enrollment and admissions process.",
      },
      {
        title: "3. Communication Consent",
        text: "I consent to being contacted by EduForYou UK and the university regarding my application, enrollment status, and any related matters via email, telephone, SMS, or postal correspondence.",
      },
      {
        title: "4. Student Finance Consent",
        text: "Where applicable, I consent to EduForYou UK sharing my data with Student Finance England (SFE) or other relevant funding bodies to facilitate my student finance application and funding arrangements.",
      },
      {
        title: "5. Declaration of Accuracy",
        text: "I declare that all information I have provided is true, complete, and accurate to the best of my knowledge. I understand that providing false or misleading information may result in the withdrawal of any offer of admission or termination of enrollment.",
      },
    ];

    for (const clause of clauses) {
      lines.push({ text: clause.title, x: leftMargin, y, size: 10, bold: true });
      y -= lineHeight;
      const wrapped = wrapText(clause.text, 90);
      for (const wl of wrapped) {
        if (y < 60) break;
        lines.push({ text: wl, x: leftMargin, y, size: 9 });
        y -= lineHeight - 2;
      }
      y -= 8;
    }

    // Signature section
    y -= 6;
    lines.push({ text: "SIGNATURE", x: leftMargin, y, size: 11, bold: true });
    y -= lineHeight + 4;
    lines.push({
      text: "By signing below, I confirm that I have read, understood, and agree to all",
      x: leftMargin, y, size: 9,
    });
    y -= lineHeight - 2;
    lines.push({ text: "the above declarations.", x: leftMargin, y, size: 9 });
    y -= sectionGap;

    // Typed name as signature
    if (signature) {
      lines.push({ text: `Signed by: ${signature}`, x: leftMargin, y, size: 11, bold: true });
      y -= lineHeight;
    }

    // Embed signature image if provided
    let sigImageBytes: Uint8Array | undefined;
    let sigRect: { x: number; y: number; width: number; height: number } | undefined;

    if (signatureImage) {
      // signatureImage is a data:image/png;base64,... string
      const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, "");
      const binaryString = atob(base64Data);
      const pngBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pngBytes[i] = binaryString.charCodeAt(i);
      }

      // Instead of trying to parse PNG (complex), we'll embed it as a JPEG-like
      // Actually, let's use the PNG directly with proper PDF image XObject
      // We need to decompress the PNG IDAT data for raw pixels
      
      // Simpler approach: draw signature line and embed image reference
      // For Deno edge function, use the PNG bytes directly
      sigImageBytes = pngBytes;
      
      // Position: below the "Signed by" text, reasonable size
      const sigWidth = 200;
      const sigHeight = 60;
      y -= 4;
      sigRect = { x: leftMargin, y: y - sigHeight, width: sigWidth, height: sigHeight };
      y -= sigHeight + 8;
    }

    lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: leftMargin, y, size: 10 });

    // Build PDF - for signature image we need a different approach
    // Since raw PNG parsing in edge functions is complex, we'll embed the PNG 
    // as a raw XObject using the full PNG stream
    let pdfBytes: Uint8Array;

    if (sigImageBytes && sigRect) {
      pdfBytes = buildPdfWithImage(lines, sigImageBytes, sigRect);
    } else {
      pdfBytes = buildPdf(lines);
    }

    // Convert to base64
    let base64 = "";
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < pdfBytes.length; i += CHUNK_SIZE) {
      const chunk = pdfBytes.slice(i, i + CHUNK_SIZE);
      base64 += btoa(String.fromCharCode(...chunk));
    }

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

function buildPdfWithImage(
  lines: { text: string; x: number; y: number; size?: number; bold?: boolean }[],
  pngBytes: Uint8Array,
  sigRect: { x: number; y: number; width: number; height: number }
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  function pushText(s: string) {
    chunks.push(encoder.encode(s));
  }

  function pushBytes(b: Uint8Array) {
    chunks.push(b);
  }

  function currentLength(): number {
    let len = 0;
    for (const c of chunks) len += c.length;
    return len;
  }

  // Build text content stream
  let textStream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    textStream += `${fontKey} ${fontSize} Tf\n`;
    textStream += `1 0 0 1 ${line.x} ${line.y} Tm\n`;
    textStream += `(${escaped}) Tj\n`;
  }
  textStream += "ET\n";

  // Add image drawing command
  textStream += "q\n";
  textStream += `${sigRect.width} 0 0 ${sigRect.height} ${sigRect.x} ${sigRect.y} cm\n`;
  textStream += "/SigImg Do\n";
  textStream += "Q\n";

  const textStreamBytes = encoder.encode(textStream);

  // Object offsets tracking
  const objOffsets: number[] = [];

  pushText("%PDF-1.4\n%\xC3\xA2\xC3\xA3\xC3\x8F\xC3\x93\n");

  // Obj 1 - Catalog
  objOffsets.push(currentLength());
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2 - Pages
  objOffsets.push(currentLength());
  pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Obj 3 - Page
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

  // Obj 7 - Signature Image XObject (embed PNG directly)
  // PDF doesn't natively support PNG, but we can use FlateDecode on the raw data
  // Simplest portable approach: embed as inline image won't work for XObject
  // 
  // Best approach for edge function: decode PNG manually
  // Parse PNG IHDR for dimensions, collect IDAT chunks, decompress with DecompressionStream
  
  // Actually, we'll take a pragmatic approach:
  // Render the signature canvas data as a JPEG-compatible stream
  // Or even simpler - embed the full PNG as an image with no filter and let viewers handle it
  
  // The most reliable approach in a Deno edge function:
  // Use the fact that canvas toDataURL produces PNG
  // We need to decode the PNG to raw RGB pixels
  // Let's use DecompressionStream (available in Deno)
  
  const pngData = decodePngToRaw(pngBytes);
  
  if (pngData) {
    objOffsets.push(currentLength());
    pushText(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pngData.width} /Height ${pngData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${pngData.rgb.length} >>\nstream\n`);
    pushBytes(pngData.rgb);
    pushText("\nendstream\nendobj\n");
  } else {
    // Fallback: create a 1x1 transparent pixel so PDF is still valid
    const fallbackRgb = new Uint8Array([255, 255, 255]);
    objOffsets.push(currentLength());
    pushText(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\n`);
    pushBytes(fallbackRgb);
    pushText("\nendstream\nendobj\n");
  }

  const numObjects = 7;
  const xrefOffset = currentLength();
  pushText("xref\n");
  pushText(`0 ${numObjects + 1}\n`);
  pushText("0000000000 65535 f \n");
  for (const offset of objOffsets) {
    pushText(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  pushText("trailer\n");
  pushText(`<< /Size ${numObjects + 1} /Root 1 0 R >>\n`);
  pushText("startxref\n");
  pushText(`${xrefOffset}\n`);
  pushText("%%EOF\n");

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}

// Synchronous PNG decoder using inflate (zlib raw)
function decodePngToRaw(png: Uint8Array): { width: number; height: number; rgb: Uint8Array } | null {
  try {
    // Verify PNG signature
    if (png[0] !== 137 || png[1] !== 80 || png[2] !== 78 || png[3] !== 71) {
      console.error("Not a valid PNG");
      return null;
    }

    let offset = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks: Uint8Array[] = [];

    while (offset < png.length) {
      const chunkLen = readUint32(png, offset);
      const chunkType = String.fromCharCode(png[offset+4], png[offset+5], png[offset+6], png[offset+7]);
      const chunkData = png.slice(offset + 8, offset + 8 + chunkLen);

      if (chunkType === "IHDR") {
        width = readUint32(chunkData, 0);
        height = readUint32(chunkData, 4);
        bitDepth = chunkData[8];
        colorType = chunkData[9];
      } else if (chunkType === "IDAT") {
        idatChunks.push(chunkData);
      } else if (chunkType === "IEND") {
        break;
      }

      offset += 12 + chunkLen; // 4 len + 4 type + data + 4 crc
    }

    if (width === 0 || height === 0) return null;

    // Combine IDAT chunks
    let totalLen = 0;
    for (const c of idatChunks) totalLen += c.length;
    const compressed = new Uint8Array(totalLen);
    let pos = 0;
    for (const c of idatChunks) {
      compressed.set(c, pos);
      pos += c.length;
    }

    // Decompress using pako-like manual inflate
    // In Deno, we can use the built-in DecompressionStream but it's async
    // We'll use a sync approach by calling Deno's compression API
    
    // Actually let's use a simpler sync zlib inflate
    const decompressed = syncInflate(compressed);
    if (!decompressed) return null;

    // Determine bytes per pixel based on color type
    let bpp = 0;
    switch (colorType) {
      case 0: bpp = 1; break; // Grayscale
      case 2: bpp = 3; break; // RGB
      case 4: bpp = 2; break; // Grayscale + Alpha
      case 6: bpp = 4; break; // RGBA
      default: return null;
    }

    const bytesPerRow = width * bpp;
    const rgb = new Uint8Array(width * height * 3);

    // Unfilter scanlines
    let srcOffset = 0;
    const prevRow = new Uint8Array(bytesPerRow);
    const currentRow = new Uint8Array(bytesPerRow);

    for (let row = 0; row < height; row++) {
      const filterByte = decompressed[srcOffset++];

      // Read raw scanline
      for (let i = 0; i < bytesPerRow; i++) {
        currentRow[i] = decompressed[srcOffset++] || 0;
      }

      // Apply filter
      for (let i = 0; i < bytesPerRow; i++) {
        const a = i >= bpp ? currentRow[i - bpp] : 0; // left
        const b = prevRow[i]; // above
        const c = i >= bpp ? prevRow[i - bpp] : 0; // upper-left

        switch (filterByte) {
          case 0: break; // None
          case 1: currentRow[i] = (currentRow[i] + a) & 0xFF; break; // Sub
          case 2: currentRow[i] = (currentRow[i] + b) & 0xFF; break; // Up
          case 3: currentRow[i] = (currentRow[i] + Math.floor((a + b) / 2)) & 0xFF; break; // Average
          case 4: currentRow[i] = (currentRow[i] + paethPredictor(a, b, c)) & 0xFF; break; // Paeth
        }
      }

      // Extract RGB
      for (let x = 0; x < width; x++) {
        const dstIdx = (row * width + x) * 3;
        switch (colorType) {
          case 0: // Grayscale
            rgb[dstIdx] = rgb[dstIdx+1] = rgb[dstIdx+2] = currentRow[x];
            break;
          case 2: // RGB
            rgb[dstIdx] = currentRow[x*3];
            rgb[dstIdx+1] = currentRow[x*3+1];
            rgb[dstIdx+2] = currentRow[x*3+2];
            break;
          case 4: // Grayscale + Alpha - render on white bg
          {
            const gray = currentRow[x*2];
            const alpha = currentRow[x*2+1];
            const blended = Math.round(gray * (alpha/255) + 255 * (1 - alpha/255));
            rgb[dstIdx] = rgb[dstIdx+1] = rgb[dstIdx+2] = blended;
            break;
          }
          case 6: // RGBA - composite on white background
          {
            const r = currentRow[x*4];
            const g = currentRow[x*4+1];
            const b2 = currentRow[x*4+2];
            const a2 = currentRow[x*4+3] / 255;
            rgb[dstIdx] = Math.round(r * a2 + 255 * (1 - a2));
            rgb[dstIdx+1] = Math.round(g * a2 + 255 * (1 - a2));
            rgb[dstIdx+2] = Math.round(b2 * a2 + 255 * (1 - a2));
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

function readUint32(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset+1] << 16) | (data[offset+2] << 8) | data[offset+3]) >>> 0;
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

// Synchronous zlib inflate (skip 2-byte zlib header, use raw deflate)
function syncInflate(data: Uint8Array): Uint8Array | null {
  try {
    // Skip zlib header (2 bytes) and use raw deflate data
    // Zlib format: CMF (1 byte) + FLG (1 byte) + compressed data + Adler32 (4 bytes)
    const cmf = data[0];
    const compressionMethod = cmf & 0x0F;
    if (compressionMethod !== 8) return null; // Not deflate

    const rawData = data.slice(2, data.length - 4); // Skip header and adler32

    // Manual deflate decompression
    return inflateRaw(rawData);
  } catch (e) {
    console.error("Inflate error:", e);
    return null;
  }
}

// Minimal raw DEFLATE decompressor
function inflateRaw(data: Uint8Array): Uint8Array {
  const output: number[] = [];
  let bitBuf = 0;
  let bitCount = 0;
  let pos = 0;

  function readBits(n: number): number {
    while (bitCount < n) {
      if (pos >= data.length) throw new Error("Unexpected end of data");
      bitBuf |= data[pos++] << bitCount;
      bitCount += 8;
    }
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>= n;
    bitCount -= n;
    return val;
  }

  function readByte(): number {
    return readBits(8);
  }

  // Fixed Huffman length code lengths
  const fixedLitLenLengths = new Uint8Array(288);
  for (let i = 0; i <= 143; i++) fixedLitLenLengths[i] = 8;
  for (let i = 144; i <= 255; i++) fixedLitLenLengths[i] = 9;
  for (let i = 256; i <= 279; i++) fixedLitLenLengths[i] = 7;
  for (let i = 280; i <= 287; i++) fixedLitLenLengths[i] = 8;

  const fixedDistLengths = new Uint8Array(32);
  for (let i = 0; i < 32; i++) fixedDistLengths[i] = 5;

  const LENGTH_EXTRA_BITS = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const LENGTH_BASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const DIST_EXTRA_BITS = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const DIST_BASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];

  interface HuffmanTable {
    counts: Uint8Array;
    symbols: Uint16Array;
  }

  function buildHuffmanTable(lengths: Uint8Array, maxLen: number): HuffmanTable {
    const counts = new Uint8Array(16);
    const symbols = new Uint16Array(lengths.length);

    for (let i = 0; i < lengths.length; i++) {
      if (lengths[i]) counts[lengths[i]]++;
    }

    const offsets = new Uint16Array(16);
    for (let i = 1; i < 16; i++) {
      offsets[i] = offsets[i - 1] + counts[i - 1];
    }

    for (let i = 0; i < lengths.length; i++) {
      if (lengths[i]) {
        symbols[offsets[lengths[i]]++] = i;
      }
    }

    return { counts, symbols };
  }

  function decodeSymbol(table: HuffmanTable): number {
    let code = 0;
    let first = 0;
    let index = 0;

    for (let len = 1; len <= 15; len++) {
      code |= readBits(1);
      const count = table.counts[len];
      if (code < first + count) {
        return table.symbols[index + (code - first)];
      }
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }

    throw new Error("Invalid Huffman code");
  }

  function decodeBlock(litLenTable: HuffmanTable, distTable: HuffmanTable) {
    while (true) {
      const sym = decodeSymbol(litLenTable);

      if (sym < 256) {
        output.push(sym);
      } else if (sym === 256) {
        return; // End of block
      } else {
        // Length
        const lengthIdx = sym - 257;
        let length = LENGTH_BASE[lengthIdx];
        if (LENGTH_EXTRA_BITS[lengthIdx] > 0) {
          length += readBits(LENGTH_EXTRA_BITS[lengthIdx]);
        }

        // Distance
        const distSym = decodeSymbol(distTable);
        let dist = DIST_BASE[distSym];
        if (DIST_EXTRA_BITS[distSym] > 0) {
          dist += readBits(DIST_EXTRA_BITS[distSym]);
        }

        // Copy
        for (let i = 0; i < length; i++) {
          output.push(output[output.length - dist]);
        }
      }
    }
  }

  // Process blocks
  let bfinal = 0;
  do {
    bfinal = readBits(1);
    const btype = readBits(2);

    if (btype === 0) {
      // Stored block
      bitBuf = 0;
      bitCount = 0;
      const len = data[pos] | (data[pos + 1] << 8);
      pos += 4; // skip len and nlen
      for (let i = 0; i < len; i++) {
        output.push(data[pos++]);
      }
    } else if (btype === 1) {
      // Fixed Huffman
      const litLenTable = buildHuffmanTable(fixedLitLenLengths, 288);
      const distTable = buildHuffmanTable(fixedDistLengths, 32);
      decodeBlock(litLenTable, distTable);
    } else if (btype === 2) {
      // Dynamic Huffman
      const hlit = readBits(5) + 257;
      const hdist = readBits(5) + 1;
      const hclen = readBits(4) + 4;

      const codeLenOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      const codeLenLengths = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) {
        codeLenLengths[codeLenOrder[i]] = readBits(3);
      }

      const codeLenTable = buildHuffmanTable(codeLenLengths, 19);

      const allLengths = new Uint8Array(hlit + hdist);
      let i = 0;
      while (i < hlit + hdist) {
        const sym = decodeSymbol(codeLenTable);
        if (sym < 16) {
          allLengths[i++] = sym;
        } else if (sym === 16) {
          const repeat = readBits(2) + 3;
          const prev = allLengths[i - 1];
          for (let j = 0; j < repeat; j++) allLengths[i++] = prev;
        } else if (sym === 17) {
          const repeat = readBits(3) + 3;
          for (let j = 0; j < repeat; j++) allLengths[i++] = 0;
        } else if (sym === 18) {
          const repeat = readBits(7) + 11;
          for (let j = 0; j < repeat; j++) allLengths[i++] = 0;
        }
      }

      const litLenLengths = allLengths.slice(0, hlit);
      const distLengths = allLengths.slice(hlit, hlit + hdist);

      const litLenTable = buildHuffmanTable(litLenLengths, hlit);
      const distTable = buildHuffmanTable(distLengths, hdist);
      decodeBlock(litLenTable, distTable);
    } else {
      throw new Error("Invalid block type");
    }
  } while (!bfinal);

  return new Uint8Array(output);
}
