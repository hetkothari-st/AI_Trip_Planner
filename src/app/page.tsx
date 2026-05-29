import Link from "next/link";
import {
  Compass,
  Map as MapIcon,
  Sparkles,
  Route,
  Hotel,
  FileDown,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Compass, title: "Region discovery", body: "Tell us a destination — we surface its belts and regions with a seasonality index and what travellers love about each." },
  { icon: Sparkles, title: "AI-ranked places", body: "We scan the web, YouTube and Reddit, then rank the top places into rich, photo-led banners." },
  { icon: MapIcon, title: "Live map routing", body: "Pin places across categories and watch the route connect in real time with travel times." },
  { icon: Route, title: "Smart optimization", body: "Pick a start, leave the end open — get the least-time route that covers everything efficiently." },
  { icon: Hotel, title: "Hotels & costs", body: "Compare hotels and prices across booking sites with a live, running cost calculator." },
  { icon: FileDown, title: "Polished itinerary", body: "A professional day-by-day plan with pictures and a mini-map, exportable to PDF and Excel." },
];

export default function Home() {
  return (
    <main className="hero-gradient">
      {/* Nav */}
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <Compass className="size-6 text-primary" />
          <span className="font-serif text-xl font-semibold tracking-tight">Voyager</span>
        </div>
        <Button asChild variant="ghost">
          <Link href="/plan">Open planner</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <div className="animate-fade-in">
          <Badge variant="muted" className="mb-5">
            <Sparkles className="mr-1.5 size-3.5" /> AI-native trip planning
          </Badge>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Plan extraordinary journeys, guided by AI.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            From “I want to visit Uttarakhand but don’t know where” to a polished,
            map-routed itinerary — Voyager discovers regions, ranks the best places from
            across the internet, and builds the plan with you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/plan">
                Start planning <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/plan">See how it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Try <span className="font-medium text-foreground">“Uttarakhand”</span> — works
            instantly, no sign-up.
          </p>
        </div>

        <div className="relative animate-fade-in">
          <div className="overflow-hidden rounded-2xl border shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/himalaya-voyager/900/700"
              alt="Mountain landscape"
              className="h-[420px] w-full object-cover"
            />
          </div>
          <div className="glass absolute -bottom-5 -left-5 hidden rounded-xl border p-4 shadow-lg sm:block">
            <p className="text-xs text-muted-foreground">Best season</p>
            <p className="font-serif text-lg font-semibold">Autumn in Garhwal</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <h2 className="font-serif text-3xl font-semibold tracking-tight">
          Everything for the whole journey
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A single, beautiful workflow that takes you from inspiration to a downloadable plan.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container border-t py-10 text-sm text-muted-foreground">
        Voyager — AI Trip Planner. Built as a phased product; this release covers region
        discovery → ranked places → live map routing.
      </footer>
    </main>
  );
}
