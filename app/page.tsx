import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-blue-700 mb-3">BehaviorFit</h1>
      <p className="text-gray-600 text-lg mb-8">
        ABA-based fitness tracking for behavior analysts
      </p>
      <Link
        href="/clients"
        className="bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-800 transition"
      >
        Go to Clients
      </Link>
    </div>
  );
}
