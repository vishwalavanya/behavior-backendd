import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const { username, deviceType, current } = await req.json();

    if (!username || !deviceType || !current) {
      return NextResponse.json({ allowed: true });
    }

    const { data: profile } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .single();

    if (!profile || !profile.training_completed) {
      return NextResponse.json({ allowed: true });
    }

    let suspicious = false;

    // 🧠 Laptop logic
    if (deviceType === "laptop") {
      if (
        current.typing_delay &&
        Math.abs(current.typing_delay - profile.avg_typing_delay) /
          profile.avg_typing_delay >
          0.4
      ) {
        suspicious = true;
      }
    }

    // 📱 Phone logic
    if (deviceType === "phone") {
      const dx = Math.abs(current.touch_x - profile.avg_touch_x);
      const dy = Math.abs(current.touch_y - profile.avg_touch_y);

      if (dx > 120 || dy > 120) {
        suspicious = true;
      }
    }

    return NextResponse.json({ allowed: !suspicious });

  } catch (err) {
    console.error("Verification failed", err);
    return NextResponse.json({ allowed: true });
  }
}
