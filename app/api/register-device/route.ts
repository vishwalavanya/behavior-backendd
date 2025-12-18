import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, deviceType } = body;

    // ❌ Validation
    if (!username || !deviceType) {
      console.warn("⚠️ Missing fields", body);
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 🔥 LOG — THIS WILL APPEAR IN RENDER
    console.log("📡 Behavior Event Received");
    console.log({
      username,
      deviceType,
      timestamp: new Date().toISOString(),
    });

    // 🗄️ Insert into Supabase
    const { data, error } = await supabase
      .from("devices")
      .insert([
        {
          username,
          device_type: deviceType,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    // ⚠️ Device already exists or constraint error
    if (error) {
      console.warn("ℹ️ Device already exists or insert blocked", {
        username,
        deviceType,
        error: error.message,
      });

      return NextResponse.json(
        { status: "EXISTS" },
        { status: 200, headers: corsHeaders }
      );
    }

    // ✅ Successfully created
    console.log("✅ Device registered successfully", data);

    return NextResponse.json(
      { status: "CREATED" },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error("❌ register-device API crashed", err);

    return NextResponse.json(
      { status: "ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}




