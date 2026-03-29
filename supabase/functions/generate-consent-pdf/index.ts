import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple PDF builder - creates a valid PDF with text and optional image
function buildPdf(
  lines: { text: string; x: number; y: number; size?: number; bold?: boolean }[],
  signatureImage?: { base64: string; x: number; y: number; width: number; height: number }
): Uint8Array {
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];

  function addObject(content: string): number {
    objectCount++;
    offsets.push(-1);
    objects.push(content);
    return objectCount;
  }

  // Catalog
  addObject("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  // Pages
  addObject("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");

  // Build content stream
  let stream = "BT\n";
  for (const line of lines) {
    const fontKey = line.bold ? "/F2" : "/F1";
    const fontSize = line.size || 10;
    const escaped = line.text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    stream += `${fontKey} ${fontSize} Tf\n`;
    stream += `${line.x} ${line.y} Td\n`;
    stream += `(${escaped}) Tj\n`;
    stream += `0 0 Td\n`;
  }
  stream += "ET\n";

  // Add signature image draw command if present
  if (signatureImage) {
    stream += "q\n";
    stream += `${signatureImage.width} 0 0 ${signatureImage.height} ${signatureImage.x} ${signatureImage.y} cm\n`;
    stream += "/Sig Do\n";
    stream += "Q\n";
  }

  const streamBytes = new TextEncoder().encode(stream);

  if (signatureImage) {
    // Decode the base64 PNG image
    const rawBase64 = signatureImage.base64.replace(/^data:image\/\w+;base64,/, "");
    const imgBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));

    // Page with image XObject reference
    addObject(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R /F2 6 0 R >> /XObject << /Sig 7 0 R >> >> >>\nendobj`
    );
    // Font Helvetica
    addObject(
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj"
    );
    // Content stream
    addObject(
      `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj`
    );
    // Font Helvetica-Bold
    addObject(
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj"
    );
    // Image XObject - use raw image data as DCTDecode won't work with PNG, so embed as inline
    // Actually for simplicity, we'll just draw the typed signature as text fallback when image can't be embedded
    // PDF doesn't natively support PNG easily without FlateDecode. Let's use the signature as text fallback.
    // Instead, we embed the image bytes as a raw stream with proper filters
    const imgHex = Array.from(imgBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    addObject(
      `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${signatureImage.width} /Height ${signatureImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${imgHex.length} /Filter /ASCIIHexDecode >>\nstream\n${imgHex}>\nendstream\nendobj`
    );
  } else {
    // Page without image
    addObject(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> >>\nendobj"
    );
    // Font Helvetica
    addObject(
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj"
    );
    // Content stream
    addObject(
      `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj`
    );
    // Font Helvetica-Bold
    addObject(
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj"
    );
  }

  // Build the PDF
  let pdf = "%PDF-1.4\n";
  for (let i = 0; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += objects[i] + "\n";
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 0; i < objectCount; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += "trailer\n";
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";

  return new TextEncoder().encode(pdf);
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

    // Use typed signature as text in the PDF (reliable across all PDF viewers)
    if (signature) {
      lines.push({ text: `Signature: ${signature}`, x: leftMargin, y, size: 11, bold: true });
      y -= lineHeight;
    } else {
      lines.push({ text: "Signature: [Signed digitally]", x: leftMargin, y, size: 11, bold: true });
      y -= lineHeight;
    }
    lines.push({ text: `Date: ${consentDate || new Date().toLocaleDateString("en-GB")}`, x: leftMargin, y, size: 10 });

    // Build PDF without image embedding (text signature is more reliable)
    const pdfBytes = buildPdf(lines);

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));

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
