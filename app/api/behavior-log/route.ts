import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, deviceType, payload } = body;

    if (!username || !deviceType || !payload) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("📡 Behavior Event Received", {
      username,
      deviceType,
      type: payload.type
    });

    // 1️⃣ Get existing profile (if any)
    const { data: existing } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .maybeSingle();

    const count = existing?.sample_count ?? 0;

    // 2️⃣ Calculate next averages
    const nextProfile = {
      username,
      device_type: deviceType,

      avg_scroll_speed:
        payload.type === "scroll" && payload.speed !== undefined
          ? ((existing?.avg_scroll_speed ?? 0) * count + payload.speed) /
            (count + 1)
          : existing?.avg_scroll_speed ?? 0,

      avg_typing_delay:
        payload.type === "typing" && payload.delay !== undefined
          ? ((existing?.avg_typing_delay ?? 0) * count + payload.delay) /
            (count + 1)
          : existing?.avg_typing_delay ?? 0,

      avg_touch_x:
        payload.type === "touch" && payload.x !== undefined
          ? ((existing?.avg_touch_x ?? 0) * count + payload.x) /
            (count + 1)
          : existing?.avg_touch_x ?? 0,

      avg_touch_y:
        payload.type === "touch" && payload.y !== undefined
          ? ((existing?.avg_touch_y ?? 0) * count + payload.y) /
            (count + 1)
          : existing?.avg_touch_y ?? 0,

      sample_count: count + 1,
      last_updated: new Date().toISOString()
    };

    // 3️⃣ UPSERT (atomic, race-condition safe)
    await supabase
      .from("behavior_profiles")
      .upsert(nextProfile, {
        onConflict: "username,device_type"
      });

    console.log(
      existing
        ? "📈 Behavior profile updated"
        : "🆕 Behavior profile created"
    );

    return NextResponse.json(
      { status: "LEARNED" },
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("❌ Behavior learning failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}


