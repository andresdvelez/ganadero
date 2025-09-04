import Image from "next/image";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative bg-[radial-gradient(1200px_600px_at_50%_-10%,_#ffffff_0%,_#f2f2f2_60%,_#f2f2f2_100%)]">
      <div className="absolute -left-12 -top-12">
        <Image
          src="/brand/full-logo-white.jpeg"
          alt="Ganado AI"
          width={304}
          height={198}
          priority
        />
      </div>

      <div className="grid place-items-center px-4 min-h-screen items-center justify-center">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-neutral-500">
            Al iniciar sesión aceptas nuestros términos y políticas.
          </p>
        </div>
      </div>
    </div>
  );
}
