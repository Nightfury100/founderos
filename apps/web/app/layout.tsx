import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FounderOS",
  description: "The founder's AI Chief of Staff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page font-sans text-primary antialiased">{children}</body>
    </html>
  );
}
