import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PNG } from "npm:pngjs@7.0.0";
import { Buffer } from "node:buffer";

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

function decodePngToRgb(pngBytes: Uint8Array): Promise<{ width: number; height: number; rgb: Uint8Array } | null> {
  return new Promise((resolve) => {
    try {
      const png = new PNG();
      png.parse(Buffer.from(pngBytes), (err: Error | null, data: any) => {
        if (err || !data) {
          console.error("pngjs parse error:", err);
          resolve(null);
          return;
        }
        const { width, height } = data;
        const pixels = data.data; // RGBA buffer
        const rgb = new Uint8Array(width * height * 3);

        for (let i = 0; i < width * height; i++) {
          const r = pixels[i * 4];
          const g = pixels[i * 4 + 1];
          const b = pixels[i * 4 + 2];
          const a = pixels[i * 4 + 3] / 255;
          // Composite on white background
          rgb[i * 3] = Math.round(r * a + 255 * (1 - a));
          rgb[i * 3 + 1] = Math.round(g * a + 255 * (1 - a));
          rgb[i * 3 + 2] = Math.round(b * a + 255 * (1 - a));
        }

        resolve({ width, height, rgb });
      });
    } catch (e) {
      console.error("PNG decode error:", e);
      resolve(null);
    }
  });
}

type Line = { text: string; x: number; y: number; size?: number; bold?: boolean };

function buildTextOnlyPdf(lines: Line[]): Uint8Array {
  let stream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    stream += `${fontKey} ${fontSize} Tf\n1 0 0 1 ${line.x} ${line.y} Tm\n(${escaped}) Tj\n`;
  }
  stream += "ET\n";

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
  pdf += `6 0 obj\n<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`;

  const xref = pdf.length;
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

function buildPdfWithImage(
  lines: Line[],
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

  let textStream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    textStream += `${fontKey} ${fontSize} Tf\n1 0 0 1 ${line.x} ${line.y} Tm\n(${escaped}) Tj\n`;
  }
  textStream += "ET\n";
  textStream += "q\n";
  textStream += `${sigRect.width} 0 0 ${sigRect.height} ${sigRect.x} ${sigRect.y} cm\n`;
  textStream += "/SigImg Do\n";
  textStream += "Q\n";

  const textStreamBytes = encoder.encode(textStream);
  const objOffsets: number[] = [];

  pushText("%PDF-1.4\n");

  objOffsets.push(currentLength());
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  objOffsets.push(currentLength());
  pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  objOffsets.push(currentLength());
  pushText("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /SigImg 7 0 R >> >> >>\nendobj\n");

  objOffsets.push(currentLength());
  pushText("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

  objOffsets.push(currentLength());
  pushText("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

  objOffsets.push(currentLength());
  pushText(`6 0 obj\n<< /Length ${textStreamBytes.length} >>\nstream\n`);
  pushBytes(textStreamBytes);
  pushText("\nendstream\nendobj\n");

  objOffsets.push(currentLength());
  pushText(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${imgRgb.length} >>\nstream\n`);
  pushBytes(imgRgb);
  pushText("\nendstream\nendobj\n");

  const xrefOffset = currentLength();
  pushText(`xref\n0 8\n0000000000 65535 f \n`);
  for (const o of objOffsets) pushText(`${String(o).padStart(10, "0")} 00000 n \n`);
  pushText(`trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const result = new Uint8Array(totalLen);
  let p = 0;
  for (const c of chunks) { result.set(c, p); p += c.length; }
  return result;
}

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

    const lines: Line[] = [];
    let y = 790;
    const lm = 50;
    const lh = 14;
    const sg = 22;

    lines.push({ text: "EDUFORYOU UK", x: lm, y, size: 16, bold: true }); y -= 20;
    lines.push({ text: "Student Enrollment Consent Form", x: lm, y, size: 14, bold: true }); y -= 8;
    lines.push({ text: "_______________________________________________________________", x: lm, y, size: 10 }); y -= sg;

    lines.push({ text: "STUDENT DETAILS", x: lm, y, size: 11, bold: true }); y -= lh + 4;
    lines.push({ text: `Full Name: ${studentName}`, x: lm, y, size: 10 }); y -= lh;
    if (dateOfBirth) { lines.push({ text: `Date of Birth: ${dateOfBirth}`, x: lm, y, size: 10 }); y -= lh; }
    if (nationality) { lines.push({ text: `Nationality: ${nationality}`, x: lm, y, size: 10 }); y -= lh; }
    if (address) { for (const al of wrapText(`Address: ${address}`, 85)) { lines.push({ text: al, x: lm, y, size: 10 }); y -= lh; } }
    y -= 6;
    lines.push({ text: `University: ${universityName}`, x: lm, y, size: 10 }); y -= lh;
    for (const cl of wrapText(`Course: ${courseName}`, 85)) { lines.push({ text: cl, x: lm, y, size: 10 }); y -= lh; }
    lines.push({ text: `Enrollment Agent: ${agentName || "EduForYou UK"}`, x: lm, y, size: 10 }); y -= sg;

    lines.push({ text: "CONSENT DECLARATIONS", x: lm, y, size: 11, bold: true }); y -= lh + 4;

    const clauses = [
      { title: "1. Data Processing Consent", text: "I consent to EduForYou UK collecting, processing, and storing my personal data for the purpose of facilitating my enrollment at the above-named university. This includes sharing my personal information with the university's admissions team as required under the UK General Data Protection Regulation (UK GDPR)." },
      { title: "2. Document Sharing Consent", text: "I authorise EduForYou UK to share all documents I have provided (including identification documents, proof of address, qualifications, and any other supporting materials) with the university and relevant regulatory bodies as part of the enrollment and admissions process." },
      { title: "3. Communication Consent", text: "I consent to being contacted by EduForYou UK and the university regarding my application, enrollment status, and any related matters via email, telephone, SMS, or postal correspondence." },
      { title: "4. Student Finance Consent", text: "Where applicable, I consent to EduForYou UK sharing my data with Student Finance England (SFE) or other relevant funding bodies to facilitate my student finance application and funding arrangements." },
      { title: "5. Declaration of Accuracy", text: "I declare that all information I have provided is true, complete, and accurate to the best of my knowledge. I understand that providing false or misleading information may result in the withdrawal of any offer of admission or termination of enrollment." },
    ];

    for (const clause of clauses) {
      lines.push({ text: clause.title, x: lm, y, size: 10, bold: true }); y -= lh;
      for (const wl of wrapText(clause.text, 90)) {
        if (y < 60) break;
        lines.push({ text: wl, x: lm, y, size: 9 }); y -= lh - 2;
      }
      y -= 8;
    }

    y -= 6;
    lines.push({ text: "SIGNATURE", x: lm, y, size: 11, bold: true }); y -= lh + 4;
    lines.push({ text: "By signing below, I confirm that I have read, understood, and agree to all", x: lm, y, size: 9 }); y -= lh - 2;
    lines.push({ text: "the above declarations.", x: lm, y, size: 9 }); y -= sg;

    if (signature) {
      lines.push({ text: `Signed by: ${signature}`, x: lm, y, size: 11, bold: true }); y -= lh + 4;
    }

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
        const sigRect = { x: lm, y: y - sigHeight, width: sigWidth, height: sigHeight };
        y -= sigHeight + 8;
        lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: lm, y, size: 10 });
        pdfBytes = buildPdfWithImage(lines, decoded.rgb, decoded.width, decoded.height, sigRect);
      } else {
        lines.push({ text: "[Digital signature image]", x: lm, y, size: 9 }); y -= lh;
        lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: lm, y, size: 10 });
        pdfBytes = buildTextOnlyPdf(lines);
      }
    } else {
      lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: lm, y, size: 10 });
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
