export default function HeroBanner() {
  return (
    <div
      className="w-full h-[200px] bg-cover bg-center relative"
      style={{ backgroundImage: `url('/hero-trading.jpg')` }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* Texte centré */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <h1 className="text-white text-3xl font-bold drop-shadow-lg">
          Opportunités Marchés & Finance
        </h1>
      </div>
    </div>
  );
}
