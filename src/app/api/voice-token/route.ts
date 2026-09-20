import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ASSEMBLYAI_API_KEY is missing.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const url = new URL("https://agents.assemblyai.com/v1/token");

    url.searchParams.set("expires_in_seconds", "300");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();

      console.error("AssemblyAI token error:", message);

      return NextResponse.json(
        {
          error: "Failed to create AssemblyAI temporary token.",
          details: message,
        },
        {
          status: response.status,
        }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.token,
    });
  } catch (error) {
    console.error("Voice token route error:", error);

    return NextResponse.json(
      {
        error: "Unable to contact AssemblyAI.",
      },
      {
        status: 500,
      }
    );
  }
}