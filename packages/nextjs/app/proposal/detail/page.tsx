import type { NextPage } from "next";

const ProposalDetail: NextPage = () => {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/*Left Column*/}
        <div className="w-2/3">
          {/*Proposal Overview*/}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Update Governance Parameters</h1>
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">Active</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Proposal ID</p>
                <p className="text-md font-medium">#123</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="text-md font-medium">Committee</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Voting Period</p>
                <p className="text-md font-medium">2025-02-17 ~ 2025-03-01</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Transaction</p>
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  View on Explorer
                </a>
              </div>
            </div>

            {/*Proposal Description*/}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <div className="prose">
                This proposal suggests updating the governance parameters to improve the decision-making process: -
                Reduce minimum quorum from 60% to 51% - Extend voting period from 7 days to 14 days - Implement
                time-weighted voting power
              </div>
            </div>
          </div>

          {/* Voting Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Voting Overview</h2>

            {/* Progress Bars */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Vote Weight Approval</span>
                  <span className="text-sm font-medium text-gray-900">75.5% / 51%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Participation Rate</span>
                  <span className="text-sm font-medium text-gray-900">68.2% / 40%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Vote Statistics */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">For</p>
                <p className="text-xl font-bold text-green-700">156 votes</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Against</p>
                <p className="text-xl font-bold text-red-700">45 votes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Abstain</p>
                <p className="text-xl font-bold text-gray-700">12 votes</p>
              </div>
            </div>
          </div>

          {/* Voting Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Voting Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vote</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">0x1234...5678</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        For
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">1,000</div>
                    </td>
                    <td className="px-6 py-4">
                      <a href="#" className="text-blue-600 hover:text-blue-900">
                        View
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">0x9876...4321</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Against
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">500</div>
                    </td>
                    <td className="px-6 py-4">
                      <a href="#" className="text-blue-600 hover:text-blue-900">
                        View
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-1/3">
          {/* Voting Action Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Cast Your Vote</h2>
            <div className="space-y-4">
              <button className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300">
                Vote For
              </button>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition duration-300">
                Vote Against
              </button>
              <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-300">
                Abstain
              </button>
            </div>
          </div>

          {/* Contract Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Contract Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">DAO Contract</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm break-all">
                  0x1234567890abcdef1234567890abcdef12345678
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Explorer</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
                  View on Block Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Governance Token */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Governance Token</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Token Contract</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm break-all">
                  0xabcdef1234567890abcdef1234567890abcdef12
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Locked Value</p>
                <p className="text-lg font-bold text-gray-900">1,234,567 BCOS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProposalDetail;
