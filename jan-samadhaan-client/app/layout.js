import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Jan Samadhaan | भारत ई-शिकायत प्रणाली',
  description: 'AI-Powered Citizen Grievance Portal — Submit and track complaints with real-time resolution.',
  keywords: 'grievance, complaint, citizen, government, india, bharat',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🇮🇳</text></svg>" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111c35',
              color: '#f0f4ff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#138808', secondary: '#fff' } },
            error: { iconTheme: { primary: '#FF9933', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
