"use client";

import { CheckInForm } from "@/components/CheckInForm";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

export default function CheckInClient() {
  return (
    <>
      <InstallAppPrompt />
      <CheckInForm />
    </>
  );
}
