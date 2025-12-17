import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";



export async function POST(req: Request) {
  const { username, deviceType } = await req.json();

  if (!username || !deviceType) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("behavior_profiles")
    .select("*")
    .eq("username", username)
    .eq("device_type", deviceType)
    .single();

  if (existing) {
    return NextResponse.json({ status: "EXISTS" });
  }

  await supabase.from("behavior_profiles").insert({
    username,
    device_type: deviceType
  });

  return NextResponse.json({ status: "CREATED" });
}
