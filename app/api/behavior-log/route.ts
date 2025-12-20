import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

/* =======================
   🌐 CORS HEADERS
======================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/* =======================
   🌐 PREFLIGHT
======================= */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

/* =======================
   📡 LOG BEHAVIOR EVENT
======================= */
export async function POST(req: Request) {
  try {
    const { username, deviceType, payload } = await req.json();

    if (!username || !deviceType || !payload || !payload.type) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("📡 Behavior Event", {
      username,
      deviceType,
      type: payload.type
    });

    // ✅ SINGLE SOURCE OF TRUTH → SQL FUNCTION
    const { error } = await supabase.rpc(
      "increment_behavior_profile",
      {
        p_username: username,
        p_device_type: deviceType,
        p_type: payload.type,
        p_scroll_speed: payload.speed ?? null,
        p_typing_delay: payload.delay ?? null,
        p_touch_x: payload.x ?? null,
        p_touch_y: payload.y ?? null
      }
    );

    if (error) {
      console.error("❌ Behavior RPC failed", error);
      return NextResponse.json(
        { error: "Behavior update failed" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { status: "LOGGED" },
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("❌ Behavior log crashed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}


