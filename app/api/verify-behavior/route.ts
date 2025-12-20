import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

/* =======================
   🔐 THRESHOLDS
======================= */
const LAPTOP_MIN = 300;
const LAPTOP_MAX = 1000;

const PHONE_MIN = 300;
const PHONE_MAX = 1200;

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
   🔍 VERIFY BEHAVIOR
======================= */
export async function POST(req: Request) {
  try {
    const { username, deviceType, current } = await req.json();

    // 🟢 Fail-safe (never block accidentally)
    if (!username || !deviceType || !current) {
      return NextResponse.json(
        { allowed: true },
        { headers: corsHeaders }
      );
    }

    /* =======================
       📦 FETCH PROFILE
    ======================= */
    const { data: profile } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { allowed: true },
        { headers: corsHeaders }
      );
    }

    const sampleCount = profile.sample_count ?? 0;

    /* =======================
       🧠 MIN / MAX LOGIC
    ======================= */
    const MIN = deviceType === "phone" ? PHONE_MIN : LAPTOP_MIN;
    const MAX = deviceType === "phone" ? PHONE_MAX : LAPTOP_MAX;

    // 🟡 Training phase (no blocking)
    if (sampleCount < MIN) {
      return NextResponse.json(
        {
          allowed: true,
          trainingActive: false,
          sampleCount
        },
        { headers: corsHeaders }
      );
    }

    /* =======================
       🚨 SECURITY ACTIVE
    ======================= */
    let suspicious = false;

    // 💻 Laptop — typing rhythm
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

    // 📱 Phone — touch pattern (TEMP BASIC)
    if (deviceType === "phone") {
      const dx = Math.abs((current.x ?? 0) - profile.avg_touch_x);
      const dy = Math.abs((current.y ?? 0) - profile.avg_touch_y);

      if (dx > 120 || dy > 120) {
        suspicious = true;
      }
    }

    /* =======================
       ✅ FINAL DECISION
    ======================= */
    return NextResponse.json(
      {
        allowed: !suspicious,
        trainingActive: true,
        sampleCount,
        maxReached: sampleCount >= MAX
      },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error("❌ Verification failed", err);

    // 🟢 Fail-safe
    return NextResponse.json(
      { allowed: true },
      { headers: corsHeaders }
    );
  }
}




