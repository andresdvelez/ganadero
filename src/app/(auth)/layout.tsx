import Image from "next/image";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh min-h-screen w-dvw relative bg-[radial-gradient(120vw_60vh_at_50%_-10%,_#ffffff_0%,_#f2f2f2_60%,_#f2f2f2_100%)] bg-no-repeat">
      <div className="absolute -left-12 -top-12">
        <Image
          src="/brand/full-logo-black-nobg.png"
          alt="Ganado AI"
          width={304}
          height={198}
          priority
        />
      </div>

      <div className="grid place-items-center px-4 min-h-dvh min-h-screen items-center justify-center">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-neutral-500"></p>
            Al iniciar sesión aceptas nuestros términos y políticas.
          </p>
        </div>
      </div>
    </div>
  );
}
