import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Lab from "@/components/lab/Lab";
import Leaderboard from "@/components/Leaderboard";
import Library from "@/components/Library";
import GitHubSection from "@/components/GitHubSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="relative">
        <Hero />
        <Lab />
        <Leaderboard />
        <Library />
        <GitHubSection />
      </main>
      <Footer />
    </>
  );
}