import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 Step 1: Received POST request");

    const { name } = await req.json();
    console.log("✅ Step 2: Parsed name:", name);

    const ws = new WebSocket("ws://localhost:8080");
    console.log("✅ Step 3: WS created");

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => {
        console.log("✅ Step 4: WS opened");
        resolve();
      });
      ws.on("error", (err) => {
        console.error("❌ WS connection failed:", err);
        reject(err);
      });
    });

    const payload = JSON.stringify({
      type: "register",
      userId: name,
    });

    ws.send(payload);
    console.log("✅ Step 5: Sent payload via WS");

    ws.close();

    return NextResponse.json({ ok: true, name });
  } catch (err: any) {
    console.error("❌ FINAL CATCH ERROR:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
