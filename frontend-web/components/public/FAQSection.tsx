'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'Quels sont les prérequis pour la 1ère année ?',
    answer:
      "Le cursus est ouvert à tous. Aucun diplôme en sciences islamiques n'est requis. La 1ère année est précisément conçue pour poser les bases fondamentales.",
  },
  {
    question: 'Comment se déroulent les cours ?',
    answer:
      "Les cours ont lieu en ligne via une plateforme dédiée. Vous avez accès au direct pour interagir, ainsi qu'aux replays disponibles 24h/24 pour réviser à votre rythme.",
  },
  {
    question: 'Est-ce que je recevrai un certificat ?',
    answer:
      "Oui, une attestation de suivi est délivrée à la fin de chaque année validée, certifiant votre progression dans les thématiques étudiées.",
  },
  {
    question: 'Quel est le rythme des cours ?',
    answer:
      "Les cours sont planifiés de manière à être compatibles avec une vie professionnelle et familiale. Vous pouvez suivre les sessions en direct ou en replay selon votre disponibilité.",
  },
  {
    question: 'Y a-t-il un suivi personnalisé ?',
    answer:
      "Oui, chaque élève bénéficie d'un accompagnement personnalisé. Nos professeurs sont disponibles pour répondre à vos questions et vous guider dans votre apprentissage.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-12 sm:py-16 md:py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-secondary mb-3 sm:mb-4">Questions Fréquentes</h2>
          <p className="text-gray-500 text-sm sm:text-base md:text-lg">Tout ce que vous devez savoir avant de nous rejoindre.</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-background rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="flex items-center justify-between w-full p-4 sm:p-6 text-left cursor-pointer"
              >
                <span className="text-sm sm:text-base md:text-lg font-bold text-secondary pr-4">{faq.question}</span>
                <span
                  className={`text-primary transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-gray-600 leading-relaxed text-sm sm:text-base">{faq.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
