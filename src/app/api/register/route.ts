import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { name } = data;



  return NextResponse.json({
    username: name
  });
}
