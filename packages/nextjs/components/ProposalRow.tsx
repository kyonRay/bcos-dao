"use client";

import Link from "next/link";
import { RightOutlined } from "@ant-design/icons";
import { useTheme } from "next-themes";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { ProposalState, stateColorsClassName } from "~~/services/store/store";
import { formatUTCDate } from "~~/utils/TimeFormatter";
import { formatToken } from "~~/utils/TokenFormatter";

interface ProposalRowProps {
  id: number;
  proposer: string;
  startTime: number;
  endTime: number;
  eta: number;
  state: string | ProposalState;
  title: string;
  description: string;
  executedBlock: number;
  canceledBlock: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

// Extract category from title or description, or use default
function extractCategory(title: string, description: string): string {
  // Try to extract category from title/description
  // For now, return a default category
  if (title.toLowerCase().includes("fund") || description.toLowerCase().includes("fund")) {
    const date = new Date();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `Use of Funds (${month} ${year})`;
  }
  return "Governance";
}

// Get status text
function getStatusText(state: string | ProposalState): string {
  if (typeof state === "string") {
    return state;
  }
  return ProposalState[Number(state)] || "Unknown";
}

// Get status background color classes based on state (for the left section)
function getStatusBackgroundClasses(state: string | ProposalState, isDarkMode: boolean): string {
  const statusNum = typeof state === "string" ? undefined : Number(state);
  const colorKey = typeof state === "string" ? ProposalState[state as keyof typeof ProposalState] : statusNum;

  if (colorKey === undefined) {
    return isDarkMode ? "bg-base-300/50" : "bg-gray-200";
  }

  const colorClassName = stateColorsClassName[colorKey];

  if (isDarkMode) {
    return "bg-base-300/50";
  }

  // Return background color class based on state
  if (colorClassName === "violet") {
    return "bg-violet-200";
  }
  if (colorClassName === "rose") {
    return "bg-rose-200";
  }
  if (colorClassName === "gray") {
    return "bg-gray-200";
  }
  return "bg-gray-200";
}

// Get status badge background color classes (for the status badge)
function getStatusBadgeBackgroundClasses(state: string | ProposalState, isDarkMode: boolean): string {
  const statusNum = typeof state === "string" ? undefined : Number(state);
  const colorKey = typeof state === "string" ? ProposalState[state as keyof typeof ProposalState] : statusNum;

  if (colorKey === undefined) {
    return isDarkMode ? "bg-gray-400" : "bg-white";
  }

  const colorClassName = stateColorsClassName[colorKey];

  if (isDarkMode) {
    // In dark mode, use the color-400 variant like ProposalCard
    if (colorClassName === "violet") {
      return "bg-violet-400";
    }
    if (colorClassName === "rose") {
      return "bg-rose-400";
    }
    if (colorClassName === "gray") {
      return "bg-gray-400";
    }
    if (colorClassName === "sky") {
      return "bg-sky-400";
    }
    if (colorClassName === "emerald") {
      return "bg-emerald-400";
    }
    if (colorClassName === "teal") {
      return "bg-teal-400";
    }
    if (colorClassName === "indigo") {
      return "bg-indigo-400";
    }
    if (colorClassName === "amber") {
      return "bg-amber-400";
    }
    return "bg-gray-400";
  }

  // In light mode, use white background
  return "bg-white";
}

// Get status text color classes (for the status badge text)
function getStatusTextColorClasses(state: string | ProposalState, isDarkMode: boolean): string {
  const statusNum = typeof state === "string" ? undefined : Number(state);
  const colorKey = typeof state === "string" ? ProposalState[state as keyof typeof ProposalState] : statusNum;

  if (colorKey === undefined) {
    return isDarkMode ? "text-white" : "text-gray-600";
  }

  const colorClassName = stateColorsClassName[colorKey];

  // In dark mode, badge text should be white (since background is color-400)
  if (isDarkMode) {
    return "text-white";
  }

  // In light mode, use the color-600 variant
  if (colorClassName === "violet") {
    return "text-violet-600";
  }
  if (colorClassName === "rose") {
    return "text-rose-600";
  }
  if (colorClassName === "gray") {
    return "text-gray-600";
  }
  return "text-gray-600";
}

export const ProposalRow = ({
  id,
  title,
  startTime,
  endTime,
  state,
  executedBlock,
  canceledBlock,
  forVotes,
  againstVotes,
  abstainVotes,
}: ProposalRowProps) => {
  const { resolvedTheme } = useTheme();
  const { targetNetwork } = useTargetNetwork();
  const isDarkMode = resolvedTheme === "dark";
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default?.url;

  const category = extractCategory(title, "");
  const statusText = getStatusText(state);
  const statusBackgroundClasses = getStatusBackgroundClasses(state, isDarkMode);
  const statusBadgeBackgroundClasses = getStatusBadgeBackgroundClasses(state, isDarkMode);
  const statusTextColorClasses = getStatusTextColorClasses(state, isDarkMode);

  // Format status display text
  const displayStatus = statusText;

  // Get status info based on state
  const getStatusInfo = () => {
    if (statusText === "Executed" || (typeof state !== "string" && Number(state) === ProposalState.Executed)) {
      if (executedBlock && executedBlock > 0) {
        const blockLink = blockExplorerBaseURL
          ? `${blockExplorerBaseURL}/block/${executedBlock}`
          : `/blockexplorer/block/${executedBlock}`;
        return {
          text: `Executed in block #${executedBlock}`,
          link: blockLink,
        };
      }
      return {
        text: `Executed in block #${executedBlock || 0}`,
        link: null,
      };
    }
    if (statusText === "Canceled" || (typeof state !== "string" && Number(state) === ProposalState.Canceled)) {
      if (canceledBlock && canceledBlock > 0) {
        const blockLink = blockExplorerBaseURL
          ? `${blockExplorerBaseURL}/block/${canceledBlock}`
          : `/blockexplorer/block/${canceledBlock}`;
        return {
          text: `Canceled in block #${canceledBlock}`,
          link: blockLink,
        };
      }
      return {
        text: `Canceled in block #${canceledBlock || 0}`,
        link: null,
      };
    }
    // For other states (Defeated, Active, etc.), show voting time range
    const startDate = formatUTCDate(startTime * 1000);
    const endDate = formatUTCDate(endTime * 1000);
    return {
      text: `${startDate} - ${endDate}`,
      link: null,
    };
  };

  const statusInfo = getStatusInfo();

  // Format votes to EVP units
  const formattedForVotes = formatToken(BigInt(forVotes || 0));
  const formattedAgainstVotes = formatToken(BigInt(againstVotes || 0));
  const formattedAbstainVotes = formatToken(BigInt(abstainVotes || 0));

  return (
    <Link
      href={{ pathname: "/proposal/detail", query: { id } }}
      className="block bg-base-200 dark:bg-base-200 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-stretch gap-0">
        {/* Left: Proposal ID and Status - Full height with background */}
        <div
          className={`flex flex-row sm:flex-col items-center sm:items-start justify-center sm:justify-center min-w-full sm:min-w-[120px] px-3 sm:px-4 py-2 sm:py-2.5 self-stretch ${statusBackgroundClasses}`}
        >
          <span className="text-base sm:text-lg font-bold text-white mr-2 sm:mr-0 mb-0 sm:mb-1.5">No. {id}</span>
          <span
            className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full ${statusBadgeBackgroundClasses} ${statusTextColorClasses}`}
          >
            {displayStatus}
          </span>
        </div>

        {/* Content area with padding */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between flex-1 p-3 sm:p-3 gap-3 sm:gap-6">
          {/* Middle: Category, Title, Status Info, TX Detail */}
          <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{category}</span>
            <h3 className="text-sm sm:text-base font-bold text-base-content line-clamp-2 sm:line-clamp-none">
              {title}
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-base-content/70">
              {statusInfo.link ? (
                <a
                  href={statusInfo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-primary hover:text-primary/80 font-medium break-all"
                >
                  {statusInfo.text}
                </a>
              ) : (
                <span className="break-words">{statusInfo.text}</span>
              )}
            </div>
          </div>

          {/* Right: Voting Results and Chevron Icon */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
            {/* Voting Results */}
            <div className="flex gap-1.5 sm:gap-2">
              {/* Yes Votes */}
              <div className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 rounded bg-base-100 dark:bg-base-300 w-[60px] sm:w-[70px]">
                <span className="text-[10px] sm:text-xs text-base-content/60 dark:text-base-content/60 mb-0.5">
                  Yes
                </span>
                <span className="text-xs sm:text-sm font-semibold text-base-content">
                  {formattedForVotes.toFixed(2)}
                </span>
              </div>
              {/* No Votes */}
              <div className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 rounded bg-base-100 dark:bg-base-300 w-[60px] sm:w-[70px]">
                <span className="text-[10px] sm:text-xs text-base-content/60 dark:text-base-content/60 mb-0.5">No</span>
                <span className="text-xs sm:text-sm font-semibold text-base-content">
                  {formattedAgainstVotes.toFixed(2)}
                </span>
              </div>
              {/* Abstain Votes */}
              <div className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 rounded bg-base-100 dark:bg-base-300 w-[60px] sm:w-[70px]">
                <span className="text-[10px] sm:text-xs text-base-content/60 dark:text-base-content/60 mb-0.5">
                  Abstain
                </span>
                <span className="text-xs sm:text-sm font-semibold text-base-content">
                  {formattedAbstainVotes.toFixed(2)}
                </span>
              </div>
            </div>
            {/* Chevron Icon */}
            <div className="flex items-center flex-shrink-0 hidden sm:flex">
              <RightOutlined className="text-gray-400 dark:text-gray-500 text-sm sm:text-base" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
