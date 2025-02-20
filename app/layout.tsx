import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Truth Guardian - Fake News Detector',
  description: 'AI-powered fake news detection extension',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} w-[400px] h-[600px] bg-gradient-to-br from-slate-900 to-slate-800`}>
        {children}
      </body>
    </html>
  )
}
