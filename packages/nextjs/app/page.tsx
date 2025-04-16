"use client";

import React from "react";
import Link from "next/link";
import {
  CarryOutTwoTone,
  ContactsTwoTone,
  ContainerOutlined,
  CopyTwoTone,
  FileAddTwoTone,
  FileDoneOutlined,
  HourglassTwoTone,
  LinkOutlined,
  PlusCircleOutlined,
  ThunderboltTwoTone,
} from "@ant-design/icons";
import { Button, Popover, Space, Spin } from "antd";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ProposalCard } from "~~/components/ProposalCard";
import {
  useExecutedProposal,
  useProposalThreshold,
  useQuorumNumerator,
  useVoteSuccessThreshold,
  useVotingPeriod,
} from "~~/hooks/blockchain/BCOSGovernor";
import { useLatestProposalId, useProposalList } from "~~/hooks/blockchain/BCOSGovernor";
import { useDelegatees, useTotalSupply, useVotePower, useVotePowerDecimal } from "~~/hooks/blockchain/ERC20VotePower";
import { useMinDelay } from "~~/hooks/blockchain/useTimelock";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { formatDuration } from "~~/utils/TimeFormatter";
import { formatAddress, formatToken } from "~~/utils/TokenFormatter";

const Home: NextPage = () => {
  const { address } = useAccount();
  const pageSize = 9;
  const latestProposal = useLatestProposalId();
  const votingPower = useVotePower(address || "");
  const decimals = useVotePowerDecimal();
  const proposalThreshold = useProposalThreshold();
  const votingPeriod = useVotingPeriod();
  const { minDelay } = useMinDelay();
  const quorum = useQuorumNumerator();
  const successThreshold = useVoteSuccessThreshold();
  const totalSupply = useTotalSupply();
  const { data: proposalList, loadMore, hasMoreProposals, loading } = useProposalList(pageSize, latestProposal || 0);
  const timelock = useDeployedContractInfo({
    contractName: "CustomTimelockControllerUpgradeable",
  });
  const totoalDelegatees = useDelegatees();
  const executedProposal = useExecutedProposal();
  const { targetNetwork } = useTargetNetwork();
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default.url;
  if (
    latestProposal === undefined ||
    votingPower === undefined ||
    proposalThreshold === undefined ||
    decimals === undefined ||
    votingPeriod === undefined ||
    timelock === undefined ||
    blockExplorerBaseURL === undefined ||
    minDelay === undefined
  ) {
    return <Spin spinning={true} size="large" tip="Loading" fullscreen></Spin>;
  }
  console.log("proposalList: ", proposalList);
  return (
    <>
      <div className="container mx-auto px-4 py-6">
        <section className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-base-100 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-base-content">DAO Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-800">All Proposals</div>
                <div className="text-2xl font-bold text-blue-600">{latestProposal}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-800">Executed Proposals</div>
                <div className="text-2xl font-bold text-green-600">{executedProposal?.length}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-800">Total Delegates</div>
                <div className="text-2xl font-bold text-purple-600">{totoalDelegatees?.length}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-gray-800">Total Governance Token Supply</div>
                <div className="text-2xl font-bold text-orange-600">{formatToken(totalSupply).toFixed(4)} EVP</div>
              </div>
            </div>
          </div>

          <div className="bg-base-100 shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-base-content">DAO Governance Parameters</h2>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-1">
                <span className="text-base-conten">
                  <Popover
                    trigger="hover"
                    content={
                      <div className="flex justify-between items-center max-w-2xl">
                        DAO Proposal Executor is a Timelock contract. The DAO will submit proposals that have been voted
                        through to the Executor contract, which will control the timing of their execution.
                      </div>
                    }
                    title={"DAO Proposal Executor"}
                  >
                    <Space>
                      <ThunderboltTwoTone />
                      DAO Proposal Executor
                    </Space>
                  </Popover>
                </span>
                <span className="font-medium">
                  <Link
                    href={blockExplorerBaseURL + "/address/" + timelock.data?.address}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800"
                    rel="noopener noreferrer"
                  >
                    <Space>
                      <LinkOutlined />
                      {formatAddress(timelock.data?.address)}
                      <button
                        // onClick={() => copyToClipboard(proposal.calldatas[index])}
                        className="ml-2 p-1 hover:bg-gray-100 rounded-md flex-shrink-0"
                        title="Copy calldata"
                      >
                        <CopyTwoTone />
                      </button>
                    </Space>
                  </Link>
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-base-conten">
                  <Popover
                    trigger="hover"
                    content={
                      <div className="flex justify-between items-center max-w-2xl">
                        The proposer threshold is the minimum amount of voting power required to create a proposal.
                      </div>
                    }
                    title={"Proposer Voting Power Threshold"}
                  >
                    <Space>
                      <FileAddTwoTone />
                      Proposer Voting Power Threshold
                    </Space>
                  </Popover>
                </span>
                <span className="font-medium">{formatToken(proposalThreshold).toFixed(4)} EVP</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-base-conten">
                  <Popover
                    trigger="hover"
                    content={
                      <div className="flex justify-between items-center max-w-2xl">
                        The voting period is the time allowed for voting on a proposal. The execution minimum delay is
                        the time required before executing a proposal after it has been approved.
                      </div>
                    }
                    title={"Proposal Voting Period / Execution Minimum Delay"}
                  >
                    <Space>
                      <HourglassTwoTone />
                      Proposal Voting Period / Execution Minimum Delay
                    </Space>
                  </Popover>
                </span>
                <span className="font-medium">
                  {formatDuration(votingPeriod)} / {formatDuration(minDelay)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-base-conten">
                  <Popover
                    trigger="hover"
                    content={
                      <div className="flex justify-between items-center max-w-2xl">
                        The quorum threshold is the minimum amount of voting power required to participate voting one
                        certain proposal.
                      </div>
                    }
                    title={"Quorum Threshold"}
                  >
                    <Space>
                      <ContactsTwoTone />
                      Quorum Threshold
                    </Space>
                  </Popover>
                </span>
                <span className="font-medium">
                  {quorum} % of {formatToken(totalSupply)} EVP
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-conten">
                  <Popover
                    trigger="hover"
                    content={
                      <div className="flex justify-between items-center max-w-2xl">
                        The success threshold is the percentage of votes required for a proposal to be considered
                        successful.
                      </div>
                    }
                    title={"Voting Success Threshold"}
                  >
                    <Space>
                      <CarryOutTwoTone />
                      Voting Success Threshold
                    </Space>
                  </Popover>
                </span>
                <span className="font-medium">{successThreshold} % of voted power weight</span>
              </div>
            </div>
          </div>
        </section>

        {/*Proposal Section*/}
        <div>
          {!loading && proposalList.length === 0 ? (
            <div className="w-full flex flex-col items-center shadow-lg">
              <div className="w-full bg-base-100 backdrop-blur-sm rounded-xl border border-base-100 flex flex-col items-center">
                <div className="max-w-2xl w-full backdrop-blur-sm p-8 flex flex-col items-center">
                  {/* Empty state illustration */}
                  <div className="relative w-40 h-40 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ContainerOutlined
                        style={{ fontSize: "120px", fontWeight: "bolder" }}
                        className="w-20 h-20 text-blue-500 opacity-80"
                      />
                    </div>
                    <div className="absolute -right-3 -bottom-3 bg-indigo-500 rounded-full p-2 shadow-lg">
                      <PlusCircleOutlined style={{ fontSize: "xx-large" }} className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                    No Proposals Yet
                  </h1>

                  {/* Description */}
                  <p className="text-base-content text-center max-w-md mb-8">
                    Be the first to create a proposal for your DAO community. Proposals help drive collective decisions
                    and shape the future of our organization.
                  </p>

                  {/* Action Button */}
                  <Button
                    type="primary"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 h-auto rounded-xl font-medium text-lg shadow-md transition-all duration-200 flex items-center gap-2 mb-6"
                    href="/proposal/creation"
                  >
                    <PlusCircleOutlined style={{ fontSize: "xx-large" }} className="w-10 h-10" />
                    Create First Proposal
                  </Button>

                  {/* Info Box */}
                  <div className="w-full bg-blue-50 rounded-lg p-2 border border-blue-100 mt-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileDoneOutlined style={{ fontSize: "large" }} className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-slate-700">How proposals work</h3>
                        <div className="text-xs text-slate-600 mt-1">
                          Proposals require a minimum of {proposalThreshold / 10 ** decimals} tokens to create and will
                          be open for voting for {votingPeriod / (24 * 60 * 60)} days. Members with governance tokens
                          can cast their votes to approve or reject each proposal.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !loading &&
            proposalList.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-neutral">Proposals</h2>
                  <Link
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300"
                    href="/proposal/creation"
                  >
                    Create Proposal
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {proposalList.map(proposal => (
                    <ProposalCard key={proposal.id} {...proposal} />
                  ))}
                </div>
              </>
            )
          )}

          {loading && (
            <div className="col-span-full flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {hasMoreProposals && !loading && (
            <div className="text-center mt-8 col-span-full">
              <button
                onClick={loadMore}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
              >
                Load More Proposals
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
