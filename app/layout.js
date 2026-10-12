import "./globals.css";

export const metadata = { title: "MatuMarket", description: "Tu compra cerca de casa. Abarrotes, bebidas y pedidos por WhatsApp en Matucana." };

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
