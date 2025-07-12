import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

const ws = new WebSocket("ws://localhost:8080")

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { name } = data;

  const payload = JSON.stringify({
    type: "register",
    userId : name
  })
  const resp = ws.send(payload)  

  return NextResponse.json({
    username: name,
    responsefromws: resp
  });
}
