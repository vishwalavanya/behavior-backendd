import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { username, deviceType } = await req.json();

    if (!username || !deviceType) {
      return NextResponse.json(
        { sample_count: 0, training_completed: false },
        { headers: corsHeaders }
      );
    }

    const { data } = await supabase
      .from("behavior_profiles")
      .select("sample_count, training_completed")
      .eq("username", username)
      .eq("device_type", deviceType)
      .maybeSingle();

    return NextResponse.json(
      {
        sample_count: data?.sample_count ?? 0,
        training_completed: data?.training_completed ?? false
      },
      { headers: corsHeaders }
    );

  } catch {
    return NextResponse.json(
      { sample_count: 0, training_completed: false },
      { headers: corsHeaders }
    );
  }
}
