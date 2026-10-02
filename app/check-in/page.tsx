import { CheckInForm } from "@/components/CheckInForm";

export const metadata = {
  title: "Check In",
};

export default function CheckInPage() {
  return (
    <main className="mx-auto w-full max-w-md">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Worker Attendance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Google sign-in · location required
        </p>
      </header>
      <CheckInForm />
    </main>
  );
}
