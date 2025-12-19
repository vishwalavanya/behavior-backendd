import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const { username, deviceType, current } = await req.json();

    if (!username || !deviceType) {
      return NextResponse.json({
        allowed: true,
        trainingCompleted: false,
        sampleCount: 0
      });
    }

    const { data: profile } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .single();

    // 🧠 No profile OR training not completed → allow
    if (!profile || !profile.training_completed) {
      return NextResponse.json({
        allowed: true,
        trainingCompleted: false,
        sampleCount: profile?.sample_count ?? 0
      });
    }

    let suspicious = false;

    // 💻 Laptop check
    if (deviceType === "laptop" && current?.typing_delay) {
      const diff =
        Math.abs(current.typing_delay - profile.avg_typing_delay) /
        profile.avg_typing_delay;

      if (diff > 0.4) suspicious = true;
    }

    // 📱 Phone check
    if (deviceType === "phone" && current?.touch_x && current?.touch_y) {
      const dx = Math.abs(current.touch_x - profile.avg_touch_x);
      const dy = Math.abs(current.touch_y - profile.avg_touch_y);

      if (dx > 120 || dy > 120) suspicious = true;
    }

    return NextResponse.json({
      allowed: !suspicious,
      trainingCompleted: true,
      sampleCount: profile.sample_count
    });

  } catch (err) {
    console.error("Verification failed", err);
    return NextResponse.json({
      allowed: true,
      trainingCompleted: false,
      sampleCount: 0
    });
  }
}
