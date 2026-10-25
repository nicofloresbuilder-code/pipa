import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PIPA · el cuaderno compartido de la cisterna",
  description: "Registro de litros, entregas y cuotas de una cisterna compartida. Los datos se quedan en tu teléfono.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3efe3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <a href="#contenido" className="oculto-lector">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
