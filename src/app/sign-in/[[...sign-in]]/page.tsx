import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ranch-100 to-pasture-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-ranch-900 mb-2">Ganado AI</h1>
          <p className="text-ranch-700">Plataforma de Gestión Ganadera</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-ranch rounded-lg",
              headerTitle: "text-ranch-900",
              headerSubtitle: "text-ranch-700",
              formButtonPrimary: "bg-ranch-500 hover:bg-ranch-600",
              footerActionLink: "text-ranch-600 hover:text-ranch-700",
            },
          }}
        />
      </div>
    </div>
  );
}
