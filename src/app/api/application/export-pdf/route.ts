import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!data || !data.subject) {
      return NextResponse.json({ error: "Invalid application data." }, { status: 400 });
    }

    const tmpPdfPath = path.join(os.tmpdir(), `app-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    const scriptPath = path.join(process.cwd(), "scripts", "generate_single_application_pdf.py");

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const py = spawn("python", [scriptPath, tmpPdfPath], { stdio: ["pipe", "pipe", "pipe"] });
      let stderr = "";

      py.stdin.write(JSON.stringify(data));
      py.stdin.end();

      py.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      py.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`PDF generator exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const buf = fs.readFileSync(tmpPdfPath);
          try { fs.unlinkSync(tmpPdfPath); } catch {}
          resolve(buf);
        } catch (err) {
          reject(err);
        }
      });

      py.on("error", (err) => {
        reject(err);
      });
    });

    const filename = `Application-${(data.subject || "formal-letter").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF." },
      { status: 500 }
    );
  }
}
