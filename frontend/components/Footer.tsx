import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-bg-darker text-white mt-auto border-t-2 border-primary-500/20">
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="text-center">
          <p className="mb-2 font-medium text-sm sm:text-base">&copy; 2025 Kupito. Сите права се задржани.</p>
          <p className="text-xs sm:text-sm text-gray-400 px-2 mb-3">
            Платформа за објавување понуди за продажба на автомобили во Северна Македонија
          </p>
          <div className="flex justify-center gap-4 text-xs sm:text-sm">
            <Link 
              href="/terms" 
              className="text-gray-400 hover:text-primary-400 transition-colors duration-200 underline"
            >
              Услови за користење (Terms & Conditions)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

