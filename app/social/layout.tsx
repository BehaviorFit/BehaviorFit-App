import type { Metadata } from "next";
import SocialNav from "./SocialNav";

export const metadata: Metadata = {
  title: "Social · BehaviorFit",
};

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SocialNav />
      {children}
    </div>
  );
}
