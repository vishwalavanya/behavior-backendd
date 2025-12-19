import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const { username, deviceType, current } = await req.json();

    // 🔓 Fail-open (never block on bad payload)
    if (!username || !deviceType || !current) {
      return NextResponse.json({ allowed: true });
    }

    /* --------------------------------------------------
       1️⃣ Fetch trained behavior profile
    -------------------------------------------------- */
    const { data: profile, error } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .single();

    // 🔓 Allow if not trained yet
    if (error || !profile || !profile.training_completed) {
      return NextResponse.json({ allowed: true });
    }

    let suspicious = false;

    /* --------------------------------------------------
       2️⃣ Laptop verification (typing rhythm)
    -------------------------------------------------- */
    if (deviceType === "laptop") {
      const avg = profile.avg_typing_delay;
      const curr = current.typing_delay;

      // 🛡️ Guard against division by zero & invalid values
      if (
        typeof avg === "number" &&
        avg > 0 &&
        typeof curr === "number"
      ) {
        const deviation = Math.abs(curr - avg) / avg;

        if (deviation > 0.4) {
          suspicious = true;
        }
      }
    }

    /* --------------------------------------------------
       3️⃣ Phone verification (touch position)
    -------------------------------------------------- */
    if (deviceType === "phone") {
      const cx = current.touch_x;
      const cy = current.touch_y;
      const ax = profile.avg_touch_x;
      const ay = profile.avg_touch_y;

      // 🛡️ Numeric safety
      if (
        typeof cx === "number" &&
        typeof cy === "number" &&
        typeof ax === "number" &&
        typeof ay === "number"
      ) {
        const dx = Math.abs(cx - ax);
        const dy = Math.abs(cy - ay);

        if (dx > 120 || dy > 120) {
          suspicious = true;
        }
      }
    }

    /* --------------------------------------------------
       4️⃣ Final decision
    -------------------------------------------------- */
    return NextResponse.json({
      allowed: !suspicious
    });

  } catch (err) {
    console.error("❌ Behavior verification failed:", err);

    // 🔓 Always fail-open
    return NextResponse.json({ allowed: true });
  }
}

