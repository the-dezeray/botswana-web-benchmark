import { ArrowDownRight } from "lucide-react";

export function Landing() {
  const scrollToContent = () => {
    document.querySelector(".dash")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section className="min-h-screen flex items-center bg-white">
      <div className="mx-auto w-full max-w-7xl px-8 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left */}
          <div>

            <p className="mb-6 text-sm uppercase tracking-[0.3em] text-neutral-400">
              Botswana Digital Report · 2026
            </p>

            <h1 className="max-w-3xl text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] text-neutral-900">
              Measuring the
              <br />
              <span className="text-blue-600">
                web performance
              </span>
              <br />
              of Botswana.
            </h1>

            <p className="mt-10 max-w-xl text-lg leading-8 text-neutral-500">
              Independent Lighthouse audits covering government,
              banking, telecom, retail and media websites across Botswana.
            </p>

            <div className="mt-16 flex flex-wrap gap-10">

              <div>
                <h3 className="text-5xl font-bold text-neutral-900">
                  55+
                </h3>
                <p className="mt-2 text-neutral-500">
                  Websites Audited
                </p>
              </div>

              <div>
                <h3 className="text-5xl font-bold text-neutral-900">
                  7
                </h3>
                <p className="mt-2 text-neutral-500">
                  Industries
                </p>
              </div>

              <div>
                <h3 className="text-5xl font-bold text-neutral-900">
                  Weekly
                </h3>
                <p className="mt-2 text-neutral-500">
                  Automated Reports
                </p>
              </div>

            </div>

            <button
              onClick={scrollToContent}
              className="group mt-20 flex items-center gap-4 text-lg font-semibold text-neutral-900"
            >
              Explore Results

              <span className="rounded-full border border-neutral-300 p-3 transition group-hover:bg-black group-hover:text-white">
                <ArrowDownRight size={20} />
              </span>

            </button>

          </div>

          {/* Right */}

          <div className="relative flex justify-center">

            <div className="absolute h-[500px] w-[500px] rounded-full bg-blue-100 blur-3xl opacity-50" />

            <img
              src="/map.png"
              alt=""
              className="relative w-full max-w-xl animate-float"
            />

          </div>

        </div>
      </div>
    </section>
  );
}