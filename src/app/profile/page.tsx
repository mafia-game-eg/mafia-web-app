import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "الملف الشخصي",
};

export default function Page() {
  return <ProfileClient />;
}
