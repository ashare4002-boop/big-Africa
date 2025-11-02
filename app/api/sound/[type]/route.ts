import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request, context: { params: { type: string } }) {
  // Await params
  const params = await context.params;
  const { type } = params;

  // Validate type
  if (!["success", "error", "info"].includes(type)) {
    return new NextResponse("Invalid sound type", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "private_sounds", `${type}.mp3`);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
