const FAQ_ITEMS = [
  {
    question: "Where is Artemis II right now?",
    answer:
      "The live tracker above shows the real-time position of NASA's Artemis II Orion spacecraft. Position data is pulled from NASA/JPL Horizons every 30 seconds and interpolated continuously, so the 3D view always reflects the spacecraft's current location in space.",
  },
  {
    question: "How fast is Artemis 2 going?",
    answer:
      "Orion's speed changes throughout the mission — fastest just after trans-lunar injection, then slowing as it climbs away from Earth's gravity well, then accelerating again on the return. The live speed readout in the stats bar shows the current velocity in km/s and km/h (or miles/h in imperial mode).",
  },
  {
    question: "How long will it take Artemis 2 to get to the Moon?",
    answer:
      "The Artemis II mission is a roughly 10-day crewed lunar flyby. Orion takes several days to reach the Moon, performs a close approach, and uses lunar gravity to slingshot back toward Earth. The exact transit time depends on the trajectory flown. The upcoming milestones panel tracks key events with a live countdown.",
  },
  {
    question: "When will Artemis II reach the Moon?",
    answer:
      "The mission timeline panel on this page shows all planned milestones — including closest lunar approach — with live countdowns. The Artemis II crew will fly around the Moon without landing, reaching their closest point a few days after launch before looping back to Earth.",
  },
  {
    question: "Is there a live stream for Artemis 2?",
    answer:
      "Yes — the embedded NASA YouTube feed on this page streams live video and audio from mission control during key phases of the Artemis II mission. NASA TV covers launches, manoeuvres, lunar flyby, and splashdown. The feed is visible alongside the 3D tracker on desktop, or below the scene on mobile.",
  },
  {
    question: "Who are the Artemis II astronauts?",
    answer:
      "The Artemis II crew consists of four astronauts: Commander Reid Wiseman, Pilot Victor Glover, Mission Specialist Christina Koch (NASA), and Mission Specialist Jeremy Hansen (CSA). This is the first crewed mission beyond low-Earth orbit since Apollo 17 in 1972.",
  },
  {
    question: "How is the spacecraft position tracked?",
    answer:
      "Position data comes from NASA/JPL Horizons, the same ephemeris system used by planetary scientists worldwide. The Orion spacecraft is tracked as body -1024. Data is fetched server-side and updated every 30 seconds, then interpolated on the client so the 3D visualisation moves smoothly between data points.",
  },
  {
    question: "How long is the Artemis II mission?",
    answer:
      "Artemis II is planned as a 10-day mission. The crew launches aboard a Space Launch System (SLS) rocket, travels to the Moon on a free-return trajectory, performs a lunar flyby, and splashes down in the Pacific Ocean aboard the Orion capsule.",
  },
] as const;

function FAQItem({ question, answer }: { question: string; answer: string }): React.JSX.Element {
  return (
    <div className="border-b border-white/5 py-5 last:border-0">
      <h3 className="text-sm font-semibold text-white">{question}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{answer}</p>
    </div>
  );
}

export function AboutFAQ(): React.JSX.Element {
  return (
    <section
      aria-label="About Artemis II — Frequently Asked Questions"
      className="border-t border-white/10 bg-black/80 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          About the Mission
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-zinc-500">
          Artemis II is NASA&apos;s first crewed mission beyond low-Earth orbit in over 50 years.
          This tracker shows the live location of the Orion spacecraft — also known as the{" "}
          <strong className="text-zinc-300">Artemis 2 live tracker</strong> — using real-time data
          from NASA/JPL.
        </p>

        <div>
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>

        {/* Spanish-language blurb for Breakout Spanish queries */}
        <div className="mt-8 rounded-lg border border-white/5 bg-white/5 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            En español
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            <strong className="text-zinc-300">Artemis II en vivo</strong> — sigue la ubicación en
            tiempo real de la nave espacial Orion de la NASA. Este rastreador muestra la posición
            actual, velocidad y distancia desde la Tierra de la misión Artemis II. Los datos se
            actualizan cada 30 segundos desde NASA/JPL Horizons. <em>Despegue de Artemis 2</em> fue
            un hito histórico para la exploración espacial tripulada.
          </p>
        </div>
      </div>
    </section>
  );
}
