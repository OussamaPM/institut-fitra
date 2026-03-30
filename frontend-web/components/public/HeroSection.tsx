import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background min-h-[50vh] flex items-center">
      {/* Image de fond pour mobile */}
      <div className="absolute inset-0 lg:hidden">
        <Image
          src="/images/hero-islamic.webp"
          alt="Sciences Islamiques"
          fill
          className="object-cover object-right opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-12 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Contenu textuel */}
        <div className="order-2 lg:order-1">
<h1 className="text-4xl sm:text-5xl lg:text-7xl font-playfair font-bold text-secondary leading-tight mb-6">
            Un Cursus <br /> <span className="text-primary">Complet & Progressif</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 lg:mb-10 leading-relaxed max-w-lg">
            Une formation d'excellence en sciences islamiques adaptée à tous, pour cheminer vers Allāh avec clairvoyance.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="#cursus"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl text-center font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
            >
              Explorer le cursus
            </Link>
            <Link
              href="#programme"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-secondary border border-gray-200 rounded-xl text-center font-bold text-base sm:text-lg hover:bg-gray-50 transition-all"
            >
              Voir la 1ère année
            </Link>
          </div>
        </div>

        {/* Image avec citation - visible uniquement sur desktop */}
        <div className="relative order-1 lg:order-2 hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
            {/* Container avec aspect ratio pour maintenir les proportions */}
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/hero-islamic.webp"
                alt="Livres de Sciences Islamiques"
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {/* Overlay gradient subtil */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>

          {/* Citation flottante */}
          <div className="absolute -bottom-4 -left-4 xl:-left-8 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl max-w-[280px] border-l-4 border-primary">
            <p className="text-sm font-medium text-secondary leading-relaxed">
              "Le plus complet possible, adapté au rythme de chacun."
            </p>
            <p className="text-xs text-primary font-bold mt-2">Institut Fitra</p>
          </div>
        </div>

        {/* Citation pour mobile - positionnée différemment */}
        <div className="order-3 lg:hidden mt-8">
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-lg border-l-4 border-primary max-w-sm mx-auto">
            <p className="text-sm font-medium text-secondary leading-relaxed">
              "Le plus complet possible, adapté au rythme de chacun."
            </p>
            <p className="text-xs text-primary font-bold mt-2">Institut Fitra</p>
          </div>
        </div>
      </div>
    </section>
  );
}
