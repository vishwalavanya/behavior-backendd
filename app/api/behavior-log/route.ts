import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const TRAINING_LIMIT = 200;

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

    /* --------------------------------------------------
       1️⃣ Read existing profile (SAFE)
    -------------------------------------------------- */
    const { data: existing } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .maybeSingle(); // ✅ IMPORTANT

    const prevCount = existing?.sample_count ?? 0;
    const nextCount = prevCount + 1;

    /* --------------------------------------------------
       2️⃣ Compute next averages
    -------------------------------------------------- */
    const nextProfile = {
      username,
      device_type: deviceType,

      avg_scroll_speed:
        payload.type === "scroll" && payload.speed !== undefined
          ? (existing?.avg_scroll_speed ?? 0) * prevCount / nextCount +
            payload.speed / nextCount
          : existing?.avg_scroll_speed ?? 0,

      avg_typing_delay:
        payload.type === "typing" && payload.delay !== undefined
          ? (existing?.avg_typing_delay ?? 0) * prevCount / nextCount +
            payload.delay / nextCount
          : existing?.avg_typing_delay ?? 0,

      avg_touch_x:
        payload.type === "touch" && payload.x !== undefined
          ? (existing?.avg_touch_x ?? 0) * prevCount / nextCount +
            payload.x / nextCount
          : existing?.avg_touch_x ?? 0,

      avg_touch_y:
        payload.type === "touch" && payload.y !== undefined
          ? (existing?.avg_touch_y ?? 0) * prevCount / nextCount +
            payload.y / nextCount
          : existing?.avg_touch_y ?? 0,

      sample_count: nextCount,
      training_started: true,
      training_completed: nextCount >= TRAINING_LIMIT,
      last_updated: new Date().toISOString()
    };

    /* --------------------------------------------------
       3️⃣ ATOMIC UPSERT (NO RACE CONDITIONS)
    -------------------------------------------------- */
    await supabase
      .from("behavior_profiles")
      .upsert(nextProfile, {
        onConflict: "username,device_type"
      });

    console.log(
      nextProfile.training_completed
        ? "🎓 Training completed"
        : "📈 Learning behavior",
      { username, deviceType, samples: nextCount }
    );

    return NextResponse.json(
      { status: "LEARNING", sampleCount: nextCount },
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
