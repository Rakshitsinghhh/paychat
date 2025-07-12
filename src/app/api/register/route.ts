import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient(); // ✅ Add ()

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { name } = data;

  try {
    await prisma.user.create({
      data: { name }
    });

    console.log("user inserted");
  } catch (err) {
    console.error("Error inserting user:", err);
  }

  return NextResponse.json({
    username: name
  });
}
