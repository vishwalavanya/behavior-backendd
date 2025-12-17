import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// Handle preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { username, deviceType } = body;

  if (!username || !deviceType) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400, headers: corsHeaders }
    );
  }

  const { data, error } = await supabase
    .from("devices")
    .insert([{ username, device_type: deviceType }])
    .select();

  if (error) {
    return NextResponse.json(
      { status: "EXISTS" },
      { status: 200, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { status: "CREATED" },
    { status: 201, headers: corsHeaders }
  );
}

