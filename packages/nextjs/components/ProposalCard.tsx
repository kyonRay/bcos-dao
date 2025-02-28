"use client";

import Link from "next/link";

export const ProposalCard = () => {
  return (
    <div className="proposal-card bg-white rounded-xl shadow-lg overflow-hidden hover:-translate-y-1.5 duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">Active</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">2 days left</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Node Addition Proposal</h3>
        <p className="text-sm text-gray-600 mb-4">Proposal to add a new validator node to enhance network security.</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm">Architecture</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="text-gray-900 font-medium">62.8%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full"></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">234 votes</span>
            <Link href="/proposal/detail" className="text-blue-600 hover:text-blue-800">View Details →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
