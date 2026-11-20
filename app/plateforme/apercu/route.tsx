import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

export async function GET() {
  const sigle = await readFile(join(process.cwd(), "public/marque/alliee-sigle.png"));
  const src = `data:image/png;base64,${sigle.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "72px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={113} height={80} alt="" />
          <span style={{ fontSize: 46, fontWeight: 800, color: "#0f1d2c", letterSpacing: -1 }}>L’Alliée Virtuelle</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 66, fontWeight: 800, color: "#0f1d2c", lineHeight: 1.08, letterSpacing: -2 }}>La plateforme des Chambres de commerce</span>
          <span style={{ fontSize: 30, color: "#4b5563" }}>Adhésions, cotisations, événements et réseau des membres</span>
        </div>
        <div style={{ display: "flex", height: 10, borderRadius: 5, background: "linear-gradient(90deg, #ad0707, #007140)" }} />
      </div>
    ),
    size,
  );
}
