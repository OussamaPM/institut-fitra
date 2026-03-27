import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-4 sm:space-y-6">
        <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold">
          Prêt à commencer votre cheminement ?
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-white/90">
          Rejoignez une communauté d'apprenants motivés et bienveillants.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
          <Link
            href="/programs"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-primary rounded-lg hover:bg-gray-100 transition-all shadow-lg font-bold text-sm sm:text-base"
          >
            Découvrir les programmes
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-primary transition-all font-bold text-sm sm:text-base"
          >
            Nous contacter
          </Link>
        </div>
      </div>
    </section>
  );
}
