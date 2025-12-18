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

    /* --------------------------------------------------
       1️⃣ Fetch existing behavior profile
    -------------------------------------------------- */
    const { data: existing, error: fetchError } = await supabase
      .from("behavior_profiles")
      .select("*")
      .eq("username", username)
      .eq("device_type", deviceType)
      .maybeSingle();

    /* --------------------------------------------------
       2️⃣ If profile does NOT exist → create first row
    -------------------------------------------------- */
    if (!existing || fetchError) {
      const initialProfile = {
        username,
        device_type: deviceType,
        avg_scroll_speed:
          payload.type === "scroll" ? payload.speed ?? 0 : 0,
        avg_typing_delay:
          payload.type === "typing" ? payload.delay ?? 0 : 0,
        avg_touch_x:
          payload.type === "touch" ? payload.x ?? 0 : 0,
        avg_touch_y:
          payload.type === "touch" ? payload.y ?? 0 : 0,
        sample_count: 1,
        training_started: true,
        training_completed: false,
        last_updated: new Date().toISOString()
      };

      await supabase.from("behavior_profiles").insert(initialProfile);

      console.log("🆕 Behavior profile created", initialProfile);

      return NextResponse.json(
        { status: "PROFILE_CREATED" },
        { status: 201, headers: corsHeaders }
      );
    }

    /* --------------------------------------------------
       3️⃣ If training already completed → stop learning
    -------------------------------------------------- */
    if (existing.training_completed) {
      console.log("🛑 Training already completed — ignoring learning", {
        username,
        deviceType
      });

      return NextResponse.json(
        { status: "TRAINING_COMPLETED" },
        { status: 200, headers: corsHeaders }
      );
    }

    /* --------------------------------------------------
       4️⃣ Incremental learning (training phase)
    -------------------------------------------------- */
    const count = existing.sample_count ?? 1;

    const nextProfile = {
      avg_scroll_speed:
        payload.type === "scroll" && payload.speed !== undefined
          ? (existing.avg_scroll_speed * count + payload.speed) / (count + 1)
          : existing.avg_scroll_speed,

      avg_typing_delay:
        payload.type === "typing" && payload.delay !== undefined
          ? (existing.avg_typing_delay * count + payload.delay) / (count + 1)
          : existing.avg_typing_delay,

      avg_touch_x:
        payload.type === "touch" && payload.x !== undefined
          ? (existing.avg_touch_x * count + payload.x) / (count + 1)
          : existing.avg_touch_x,

      avg_touch_y:
        payload.type === "touch" && payload.y !== undefined
          ? (existing.avg_touch_y * count + payload.y) / (count + 1)
          : existing.avg_touch_y,

      sample_count: count + 1,
      last_updated: new Date().toISOString()
    };

    await supabase
      .from("behavior_profiles")
      .update(nextProfile)
      .eq("username", username)
      .eq("device_type", deviceType);

    console.log("📈 Learning behavior", {
      username,
      deviceType,
      samples: nextProfile.sample_count
    });

    /* --------------------------------------------------
       5️⃣ Training completion check (THRESHOLD = 200)
    -------------------------------------------------- */
    if (nextProfile.sample_count >= 200) {
      await supabase
        .from("behavior_profiles")
        .update({
          training_completed: true,
          last_updated: new Date().toISOString()
        })
        .eq("username", username)
        .eq("device_type", deviceType);

      console.log("🎓 Training completed for", username, deviceType);
    }

    return NextResponse.json(
      { status: "LEARNING" },
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
