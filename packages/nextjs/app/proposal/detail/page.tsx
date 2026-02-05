"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircleOutlined, CloseCircleOutlined, LinkOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Collapse, Modal, Spin, message, notification } from "antd";
import TextArea from "antd/es/input/TextArea";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { ProposalOverview } from "~~/components/proposal/ProposalOverview";
import { Address } from "~~/components/scaffold-eth";
import {
  decodeData,
  useApproveProposal,
  useCancelProposal,
  useCastVote,
  useEmergencyShutdownProposal,
  useExecuteProposal,
  useHasVoted,
  useIsMaintainer,
  usePastQuorumNumerator,
  useProposalAllInfo,
  useProposalVoterInfo,
  useProposalVoters,
  useQueueProposal,
  useQuorumNumerator,
  useVoteSuccessThreshold,
} from "~~/hooks/blockchain/BCOSGovernor";
import { usePastVotePower, useTotalSupply } from "~~/hooks/blockchain/ERC20VotePower";
import { useTransactionsByAddress } from "~~/hooks/blockchain/useTransactionByAddress";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { ProposalState, VoteType, voteTypeToString } from "~~/services/store/store";
import { formatUTCDate } from "~~/utils/TimeFormatter";
import { formatToken } from "~~/utils/TokenFormatter";
import { shortenAddress } from "~~/utils/scaffold-eth/common";

const ProposalDetail: NextPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { address } = useAccount();
  const { info: proposal, refetch } = useProposalAllInfo(Number(id));
  const isMaintainer = useIsMaintainer(address || "");
  const { hasVoted, refetchHasVoted } = useHasVoted(Number(id), address || "");
  const totalSupply = useTotalSupply() || 0;
  const [voteReason, setVoteReason] = useState("");
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const [voteOption, setVoteOption] = useState<VoteType>();
  const [isVoting, setIsVoting] = useState(false);
  const queueProposal = useQueueProposal(Number(id));
  const approveProposal = useApproveProposal(Number(id));
  const cancelProposal = useCancelProposal(Number(id));
  const emergencyShutdown = useEmergencyShutdownProposal(Number(id));
  const executeProposal = useExecuteProposal(Number(id));
  const { pastVotePowerData: pastVotePower, refetchPastVotePower } = usePastVotePower(
    String(address),
    proposal?.startTime ? proposal.startTime : 0,
  );
  const { voters, refetchVoters } = useProposalVoters(Number(id));
  const castVote = useCastVote(Number(id), voteOption != null ? voteOption : VoteType.Abstain, voteReason);
  const voteSuccessThreshold = useVoteSuccessThreshold();
  // const quorumNumerator = useQuorumNumerator();
  const quorumNumerator = usePastQuorumNumerator(proposal?.startTime || 0);
  const { targetNetwork } = useTargetNetwork();
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default?.url;
  const bcosGovernor = useDeployedContractInfo({
    contractName: "BCOSGovernor",
  });
  const [notify, notifyContextHolder] = notification.useNotification();
  const timelock = useDeployedContractInfo({ contractName: "CustomTimelockControllerUpgradeable" });
  const erc20 = useDeployedContractInfo({
    contractName: "ERC20VotePower",
  });

  if (!proposal || !bcosGovernor || !timelock || !erc20 || voters === undefined) {
    return <Spin spinning={true} size="large" tip="Loading" fullscreen></Spin>;
  }

  // Convert values to BigInt for calculations
  const forVotesBigInt = BigInt(proposal.forVotes);
  const againstVotesBigInt = BigInt(proposal.againstVotes);
  const abstainVotesBigInt = BigInt(proposal.abstainVotes);
  const totalVotesBigInt = forVotesBigInt + againstVotesBigInt + abstainVotesBigInt;
  const totalSupplyBigInt = BigInt(totalSupply);

  // Calculate percentages
  const getPercentage = (value: bigint, total: bigint) => {
    if (total === 0n) return 0;
    return (Number(value) * 100) / Number(total);
  };

  // Use BigInt calculations instead
  const forPercentage = getPercentage(forVotesBigInt, totalVotesBigInt);
  const againstPercentage = getPercentage(againstVotesBigInt, totalVotesBigInt);
  const abstainPercentage = getPercentage(abstainVotesBigInt, totalVotesBigInt);

  const handleQueue = async () => {
    try {
      await queueProposal();
      message.success("Proposal queued for execution");
      refetch();
      refetchHasVoted();
      refetchPastVotePower();
      refetchVoters();
    } catch (error) {
      console.error("Error queueing proposal:", error);
      message.error("Failed to queue proposal");
    }
  };

  const handleApprove = async () => {
    try {
      await approveProposal();
      message.success("Proposal approved");
      refetch();
      refetchHasVoted();
      refetchPastVotePower();
      refetchVoters();
    } catch (error) {
      console.error("Error approving proposal:", error);
      message.error("Failed to approve proposal");
    }
  };

  const handleReject = async () => {
    try {
      await cancelProposal();
      message.success("Proposal rejected");
      refetch();
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      message.error("Failed to reject proposal");
    }
  };

  const handleEmergencyShutdown = async () => {
    try {
      await emergencyShutdown();
      message.success("Proposal emergency shutdown successful");
      refetch();
    } catch (error) {
      console.error("Error in emergency shutdown:", error);
      message.error("Failed to emergency shutdown proposal");
    }
  };

  const handleExecute = async () => {
    try {
      const eta = new Date(proposal.eta * 1000);
      const now = new Date();
      if (eta > now) {
        notify.error({
          message: "Proposal is not ready to execute",
          description: `Proposal can only be executed after ${formatUTCDate(eta.getTime())}, now is ${formatUTCDate(now.getTime())}`,
          placement: "topRight",
        });
        return;
      }
      await executeProposal();
      message.success("Proposal executed successfully");
      refetch();
    } catch (error) {
      console.error("Error executing proposal:", error);
      message.error("Failed to execute proposal");
    }
  };

  const handleVote = async () => {
    if (pastVotePower === 0n) {
      notify.error({
        message: "Your voting power is 0",
        description: "You cannot vote on this proposal.",
        placement: "topRight",
      });
      return;
    }
    if (hasVoted) {
      notify.error({
        message: "You have already voted",
        description: "You cannot vote on this proposal again.",
        placement: "topRight",
      });
      return;
    }
    try {
      setIsVoting(true);
      await castVote();
      message.success("Vote success: " + voteOption);
      refetch();
      refetchHasVoted();
      refetchPastVotePower();
      refetchVoters();
    } catch (error) {
      console.error("Error casting vote:", error);
      message.error("Failed to cast vote");
    } finally {
      setIsVoting(false);
      setVotingModalOpen(false);
    }
  };

  const renderActionButtons = () => {
    const state = Number(proposal.state);
    const hasMetQuorum = getPercentage(totalVotesBigInt, totalSupplyBigInt) >= quorumNumerator;
    const hasMetThreshold = getPercentage(forVotesBigInt, totalVotesBigInt) >= voteSuccessThreshold;

    if (state === ProposalState.Succeeded && hasMetQuorum && hasMetThreshold) {
      return (
        <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-base-content mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleQueue}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Put into execution queue
            </button>
          </div>
        </div>
      );
    }

    if (Number(proposal.state) === ProposalState.Pending && isMaintainer) {
      return (
        <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-base-content mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleApprove}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Reject
            </button>
          </div>
        </div>
      );
    }

    if (Number(proposal.state) === ProposalState.Queued && isMaintainer) {
      return (
        <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-base-content mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleEmergencyShutdown}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Emergency Shutdown
            </button>
            <button
              onClick={handleExecute}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Execute Proposal
            </button>
          </div>
        </div>
      );
    }

    if (Number(proposal.state) === ProposalState.Active && isMaintainer) {
      return (
        <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-base-content mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleEmergencyShutdown}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Emergency Shutdown
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderVotingButtons = () => {
    if (Number(proposal.state) !== ProposalState.Active || !address || hasVoted) {
      return null;
    }

    return (
      <>
        <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-base-content mb-6">Cast Your Vote</h2>
          {hasVoted ? (
            <p className="mt-4 text-sm text-gray-600">You have already voted on this proposal.</p>
          ) : (
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300 disabled:opacity-50"
              onClick={() => setVotingModalOpen(true)}
            >
              Vote on Chain
            </button>
          )}
        </div>
        <Modal
          className="w-1/3"
          title={<div className="text-lg font-bold"> Voting </div>}
          open={votingModalOpen}
          onCancel={() => setVotingModalOpen(false)}
          footer={null}
        >
          <div>
            <div className="p-1">
              <Address size="2xl" address={address} />
              <div className="mt-4">
                <div className="pt-2 pl-3 pb-2 border-t-2 border-l-2 border-r-2 rounded-t-lg border-gray-100">
                  <p className="text-sm text-base-content">Voting power</p>
                  <p className="text-3xl font-medium">{formatToken(pastVotePower).toFixed(4)} EVP</p>
                </div>
                <div className="border-2 border-gray-100 rounded-b-lg">
                  <Collapse className="bg-transparent" expandIconPosition="end" bordered={false}>
                    <Collapse.Panel header="How is my voting power calculated?" key="1">
                      <p className="text-sm text-gray-600">
                        Your voting power is calculated as the number of tokens (votes) that have been delegated to you
                        before the proposal became active. You can delegate your votes to yourself, or to someone else.
                        Others can also delegate their votes to you.
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        For votes that come from tokens that you own, if you delegated to yourself after this proposal
                        became active, they will not be counted towards your voting power for this proposal. These votes
                        will be counted towards your voting power for future proposals.
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        This behavior is intended to prevent users from changing the outcome of a vote in progress by
                        buying or borrowing additional votes.
                      </p>
                    </Collapse.Panel>
                  </Collapse>
                </div>
              </div>
              <div className="pt-6 mb-6">
                <h3 className="text-xl font-medium mb-1 overflow-hidden">
                  #{proposal?.id}: {proposal?.title}
                </h3>
              </div>
              <div className="mb-6">
                <h4 className="text-base mb-3 font-bold">Vote</h4>
                <div className="space-y-3">
                  {/* For option */}
                  <Button
                    block
                    type={voteOption === VoteType.VoteFor ? "primary" : "default"}
                    ghost={voteOption === VoteType.VoteFor}
                    onClick={() => setVoteOption(VoteType.VoteFor)}
                    className={`h-auto p-0 overflow-hidden ${voteOption === VoteType.VoteFor ? "border-green-500" : "border-gray-200"}`}
                  >
                    <div
                      className={`w-full p-3 flex items-center justify-between ${voteOption === VoteType.VoteFor ? "text-blue-600 bg-blue-50" : ""}`}
                    >
                      <div className="flex items-center">
                        <CheckCircleOutlined
                          className={`${voteOption === VoteType.VoteFor ? "text-green-500" : "text-gray-200"} mr-2`}
                        />
                        <span>For</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border ${voteOption === VoteType.VoteFor ? "border-blue-500 bg-blue-500" : "border-gray-300"} flex items-center justify-center`}
                      >
                        {voteOption === VoteType.VoteFor && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </Button>

                  {/* Against option */}
                  <Button
                    block
                    type={voteOption === VoteType.Against ? "primary" : "default"}
                    ghost={voteOption === VoteType.Against}
                    onClick={() => setVoteOption(VoteType.Against)}
                    className={`h-auto p-0 overflow-hidden ${voteOption === VoteType.Against ? "border-blue-500" : "border-gray-200"}`}
                  >
                    <div
                      className={`w-full p-3 flex items-center justify-between ${voteOption === VoteType.Against ? "text-blue-600 bg-blue-50" : ""}`}
                    >
                      <div className="flex items-center">
                        <CloseCircleOutlined
                          className={`${voteOption === VoteType.Against ? "text-red-500" : "text-gray-200"} mr-2`}
                        />
                        <span>Against</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border ${voteOption === VoteType.Against ? "border-blue-500 bg-blue-500" : "border-gray-300"} flex items-center justify-center`}
                      >
                        {voteOption === VoteType.Against && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </Button>

                  {/* Abstain option */}
                  <Button
                    block
                    type={voteOption === VoteType.Abstain ? "primary" : "default"}
                    ghost={voteOption === VoteType.Abstain}
                    onClick={() => setVoteOption(VoteType.Abstain)}
                    className={`h-auto p-0 overflow-hidden ${voteOption === VoteType.Abstain ? "border-blue-500" : "border-gray-200"}`}
                  >
                    <div
                      className={`w-full p-3 flex items-center justify-between ${voteOption === VoteType.Abstain ? "text-blue-600 bg-blue-50" : ""}`}
                    >
                      <div className="flex items-center">
                        <QuestionCircleOutlined
                          className={`${voteOption === VoteType.Abstain ? "text-gray-500" : "text-gray-200"} mr-2`}
                        />
                        <span>Abstain</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border ${voteOption === VoteType.Abstain ? "border-blue-500 bg-blue-500" : "border-gray-300"} flex items-center justify-center`}
                      >
                        {voteOption === VoteType.Abstain && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
              <div className="mb-6">
                <h4 className="text-base mb-3">Add comment</h4>
                <TextArea
                  placeholder="Why are you voting this way?"
                  rows={4}
                  value={voteReason}
                  onChange={e => setVoteReason(e.target.value)}
                  className="w-full rounded-md border-gray-200"
                />
              </div>

              <Button
                type="primary"
                block
                className="bg-gray-800 hover:bg-gray-700 h-12"
                disabled={voteOption === undefined || isVoting}
                onClick={handleVote}
              >
                Submit
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  const VoterRow = ({ voter, proposalId }: { voter: string; proposalId: number }) => {
    const { weight, support, blockNumber } = useProposalVoterInfo(proposalId, voter);
    const tx = useTransactionsByAddress(blockNumber, voter);
    const [voteTxHash, setVoteTxHash] = useState<string>();
    useEffect(() => {
      if (tx) {
        const transaction = tx.filter(t => {
          if (t.to !== bcosGovernor.data?.address) {
            return false;
          }
          const txData = decodeData(t.input, bcosGovernor.data?.abi);
          return (
            txData?.functionName === "vote" &&
            txData?.args?.find(value => {
              return value === BigInt(proposal.id);
            })
          );
        });
        if (transaction.length >= 1) {
          setVoteTxHash(transaction[0].hash);
        }
      }
    }, [tx]);
    return (
      <tr key={voter}>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            <Link
              href={`${blockExplorerBaseURL}/address/${voter}`}
              className="text-md font-medium text-primary"
              target={`_blank`}
            >
              <div>{shortenAddress(voter)}</div>
            </Link>
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${support === VoteType.VoteFor ? "bg-blue-100 text-blue-800" : support === VoteType.Against ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}
          >
            {voteTypeToString(support)}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{formatToken(weight).toFixed(4)}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            {
              <Link
                href={`${blockExplorerBaseURL}/tx/${voteTxHash}`}
                className="text-md font-medium text-primary"
                target={`_blank`}
              >
                <div>{voteTxHash?.substring(0, 25) + "..."}</div>
              </Link>
            }
          </div>
        </td>
      </tr>
    );
  };

  const renderVotingDetails = () => {
    if (!voters) return null;
    return voters.map((voter: string) => <VoterRow key={voter} voter={voter} proposalId={Number(id)} />);
  };

  const shouldShowVotingDetails = () => {
    const state = Number(proposal.state);
    return ![ProposalState.Pending, ProposalState.Canceled, ProposalState.Defeated].includes(state);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        <div className="w-2/3">
          <ProposalOverview proposal={proposal} isPreview={false} />
          {notifyContextHolder}
          {/* Voting Overview */}
          <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8 mt-8">
            <h2 className="text-xl font-bold text-base-content mb-6">Votes</h2>

            {proposal.state === ProposalState.Succeeded && (
              <div className="mb-6 p-4 bg-base-100 rounded-lg flex items-center gap-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span>This proposal has been passed. We are preparing to execute the contents.</span>
              </div>
            )}

            <div className="space-y-8">
              {/* Participated Voting Power */}
              <div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-base-content">Participated Voting Power</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-blue-400" style={{ width: `${forPercentage}%`, left: `0%` }} />
                    <div
                      className="absolute h-full bg-red-400"
                      style={{ width: `${againstPercentage}%`, left: `${forPercentage}%` }}
                    />
                    <div
                      className="absolute h-full bg-gray-400"
                      style={{
                        width: `${abstainPercentage}%`,
                        left: `${forPercentage + againstPercentage}%`,
                      }}
                    />
                    <div
                      className="absolute h-full w-px bg-base-content"
                      style={{ left: `${voteSuccessThreshold}%` }}
                    />
                  </div>
                  <div className="relative h-8">
                    <div
                      className="absolute h-full w-px bg-base-content"
                      style={{ left: `${voteSuccessThreshold}%` }}
                    />
                    <div
                      className="absolute text-sm font-medium text-base-content"
                      style={{
                        left: `calc(${voteSuccessThreshold}% + 5px)`,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      Minimum ({voteSuccessThreshold}%)
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="flex rounded-3xl items-center p-4 text-base font-semibold  text-blue-400 bg-gray-200 justify-between">
                    <div>For</div>
                    <div>
                      {formatToken(proposal.forVotes).toFixed(4)} (
                      {getPercentage(forVotesBigInt, totalVotesBigInt).toFixed(2)}%)
                    </div>
                  </div>
                  <div className="flex rounded-3xl items-center p-4 text-base font-semibold  text-red-400 bg-gray-200 justify-between">
                    <div>Against</div>
                    <div>
                      {formatToken(proposal.againstVotes).toFixed(4)} (
                      {getPercentage(againstVotesBigInt, totalVotesBigInt).toFixed(2)}%)
                    </div>
                  </div>
                  <div className="flex rounded-3xl items-center p-4 text-base font-semibold  text-gray-400 bg-gray-200 justify-between">
                    <div>Abstain</div>
                    <div>
                      {formatToken(proposal.abstainVotes).toFixed(4)} (
                      {getPercentage(abstainVotesBigInt, totalVotesBigInt).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Participation */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-base-content">Participation Rate</span>
                </div>
                <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-blue-400"
                    style={{
                      width: `${getPercentage(forVotesBigInt, totalSupplyBigInt)}%`,
                      left: "0%",
                    }}
                  />
                  <div
                    className="absolute h-full bg-red-400"
                    style={{
                      left: `${getPercentage(forVotesBigInt, totalSupplyBigInt)}%`,
                      width: `${getPercentage(againstVotesBigInt, totalSupplyBigInt)}%`,
                    }}
                  />
                  <div
                    className="absolute h-full bg-gray-400"
                    style={{
                      left: `${getPercentage(forVotesBigInt + againstVotesBigInt, totalSupplyBigInt)}%`,
                      width: `${getPercentage(abstainVotesBigInt, totalSupplyBigInt)}%`,
                    }}
                  />
                  <div className="absolute h-full w-px bg-base-content" style={{ left: `${quorumNumerator}%` }} />
                </div>
                <div className="relative h-8">
                  <div className="absolute h-full w-px bg-base-content" style={{ left: `${quorumNumerator}%` }} />
                  <div
                    className="absolute text-sm font-medium text-base-content"
                    style={{
                      left: `calc(${quorumNumerator}% + 5px)`,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    Minimum ({quorumNumerator}%)
                  </div>
                </div>

                <div className="flex rounded-3xl items-center p-4 text-base font-semibold text-gray-950 bg-gray-200 justify-between mt-4">
                  <div>Participated / Total Voting Power (Participated Rate):</div>
                  <div>
                    {formatToken(totalVotesBigInt).toFixed(4)} / {formatToken(totalSupplyBigInt).toFixed(4)} (
                    {getPercentage(totalVotesBigInt, totalSupplyBigInt).toFixed(2)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Details */}
          {shouldShowVotingDetails() && (
            <div className="bg-base-200 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-base-content mb-6">Voting Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-base-300">
                      <th className="px-6 py-3 text-left text-xs font-medium text-base-content uppercase">Voter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base-content uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base-content uppercase">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base-content uppercase">Voting TX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white divide-gray-200">{renderVotingDetails()}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="w-1/3">
          {renderVotingButtons()}

          {renderActionButtons()}

          <div className="bg-base-200 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-base-content mb-6">Contract Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-base-content">DAO Contract</p>
                <Link
                  href={`${blockExplorerBaseURL}/address/${bcosGovernor.data?.address}`}
                  className="text-md font-medium text-primary"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(bcosGovernor.data?.address)}
                </Link>
              </div>
              <div>
                <p className="text-sm text-base-content">Timelock Contract</p>
                <Link
                  href={`${blockExplorerBaseURL}/address/${timelock.data?.address}`}
                  className="text-md font-medium text-primary"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(timelock.data?.address)}
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-base-200 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-base-content mb-6">Governance Token</h2>
            <div className="space-y-4">
              <div>
                <Link
                  href={`${blockExplorerBaseURL}/address/${erc20.data?.address}`}
                  className="text-md font-medium text-primary"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(erc20.data?.address)}
                </Link>
              </div>
              <div>
                <p className="text-sm text-base-content">Total Supply Value</p>
                <p className="text-lg font-bold text-base-content">{formatToken(totalSupplyBigInt).toFixed(4)} EVP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const ProposalDetailPage = () => {
  return (
    <Suspense fallback={<Spin spinning={true} size="large" tip="Loading" fullscreen></Spin>}>
      <ProposalDetail />
    </Suspense>
  );
};

export default ProposalDetailPage;
