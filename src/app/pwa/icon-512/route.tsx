import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#ffffff",
          fontFamily: "sans-serif",
          borderRadius: 92,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 210,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          BF
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 42,
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          BeautyFlow
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}