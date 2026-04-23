import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Ontario Trail Tracker",
  description: "Explore and track hikes across the Ontario Trail Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen flex flex-col">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
