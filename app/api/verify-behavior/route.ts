import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

/* =======================
   ✅ CORS HEADERS
======================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/* =======================
   ✅ PREFLIGHT HANDLER
======================= */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

/* =======================
   ✅ VERIFY BEHAVIOR
======================= */
export async function POST(req: Request) {
  try {
    const { username, deviceType, current } = await req.json();

    if (!username || !deviceType || !current) {
      return NextResponse.json(
        { allowed: true },
        { headers: corsHeaders }
      );
    }

    const { data: profile } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .single();

    // 🟢 Allow if training not completed
    if (!profile || !profile.training_completed) {
      return NextResponse.json(
        { allowed: true },
        { headers: corsHeaders }
      );
    }

    let suspicious = false;

    /* ---------- 💻 LAPTOP LOGIC ---------- */
    if (deviceType === "laptop") {
      if (
        current.delay &&
        profile.avg_typing_delay > 0 &&
        Math.abs(current.delay - profile.avg_typing_delay) /
          profile.avg_typing_delay >
          0.4
      ) {
        suspicious = true;
      }
    }

    /* ---------- 📱 PHONE LOGIC ---------- */
    if (deviceType === "phone") {
      const dx = Math.abs((current.x ?? 0) - profile.avg_touch_x);
      const dy = Math.abs((current.y ?? 0) - profile.avg_touch_y);

      if (dx > 120 || dy > 120) {
        suspicious = true;
      }
    }

    return NextResponse.json(
      { allowed: !suspicious },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error("❌ Verification failed", err);
    return NextResponse.json(
      { allowed: true },
      { headers: corsHeaders }
    );
  }
}


