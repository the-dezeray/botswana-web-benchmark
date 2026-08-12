import fs from "fs";
import path from "path";
import HeroSection from "@/app/components/HeroSection";
import ChartSection from "@/app/components/ChartSection";

// Read ranking data once on the server — no client fetch needed for this
function getSiteData(): any[] {
  try {
    const filePath = path.join(process.cwd(), "public/results_quick.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    return json?.summary?.ranking ?? [];
  } catch {
    return [];
  }
}

export default function Home() {
  const siteData = getSiteData();

  return (
    <main className="relative w-full min-h-screen   font-ibm-plex-mono">

      {/* Hero — client island (cycling images + clipboard) */}
      <HeroSection />

      {/* Charts — lazy-loaded client bundles, rendered after page shell */}
      <ChartSection siteData={siteData} />

      <section className="w-full px-6 py-8 sm:px-10 lg:px-12">
        <div className="overflow-hidden rounded-[24px] border border-black/10 bg-[#FDE68A] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/70">
                Contact
              </p>
              <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-black">
                Feel free to talk about ideas, optimization, and feature requests.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:hello@atsb.dev"
                className="group relative overflow-hidden rounded-full border border-black/20 bg-black px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#FDE68A] transition hover:-translate-y-0.5"
              >
                <span
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(135deg, #FDE68A 0 2px, transparent 2px 8px)",
                  }}
                />
                <span className="relative z-10">Get In Touch</span>
              </a>
       
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full  text-[11px] px-6 sm:px-10 py-6 border-t border-[#0A2ADB]/10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="opacity-70">
              Botswana Website Performance Audit Benchmark — Complete Core Web
              Vitals Analysis
            </span>
            <span className="opacity-70 font-mono">
              Data source: results_quick.json
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/yourusername/bw-site-metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider">GitHub</span>
            </a>
            <a
              href="https://www.buymeacoffee.com/yourusername"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.149 1.736.207 2.234.226 4.484.33 6.723.108.52-.05 1.04-.123 1.553-.225.334-.07.809-.232.87.1.044.24-.025.488-.181.684l-.073.082z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider">Support</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}