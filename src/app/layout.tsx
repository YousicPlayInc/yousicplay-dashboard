import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yousic Play — Dashboard",
  description: "Pre-Seed Financial Model & Launch Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
